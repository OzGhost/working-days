'use strict';

(function(){
  function WorkingDateCounter () {
    var _this = this;
    var test = false;

    var ONE_DATE_MINUTES = 480;
    var MORNING_MINUTES = 180;
    var SEVEN_THIRTY = 450;
    var TWELVE = 720;
    var AFTERNOON_MINUTES = 300;
    var THIRTEEN_THIRTY = 810;
    var NINETEEN_THIRTY = 1170;
    var WHOLE_DAY = 1440;

    _this.cook = function(rawCfg) {
      return {
        lowerBound: rawCfg.lowerBound ? new Date(rawCfg.lowerBound) : undefined,
        upperBound: rawCfg.upperBound ? new Date(rawCfg.upperBound) : undefined,
        excepts: _this.cookExceptions(rawCfg.excepts)
      };
    };
  
    _this.cookExceptions = function(rawExceptions) {
      if ( ! rawExceptions) {
        return {};
      }
      var rs = {};
      var entries = Object.entries(rawExceptions);
      var len = entries.length;
      for (var i = 0; i < len; i++) {
        rs[entries[i][0]] = [
          new Date(entries[i][1][0]),
          new Date(entries[i][1][1])
        ];
      }
      return rs;
    };

    _this.count = function(start, end) {
      _this.minutes = 0;
      _this.cfg = {};
      chrome.storage.local.get(["cfg"], function(storage) {
        var rawCfg = storage.cfg || {};
        _this.cfg = _this.cook(rawCfg);

        var adjustedStart = _this.getInRangeStart(start);
        var adjustedEnd = _this.getInRangeEnd(end);
  
        _this.start = _this.getLocaleTime(adjustedStart);
        _this.end = _this.getLocaleTime(adjustedEnd);
        _this.startMID = _this.minuteInDay(adjustedStart);
        _this.endMID = _this.minuteInDay(adjustedEnd);
        _this.beginningDay = adjustedStart.getDay();
        _this.endingDay = adjustedEnd.getDay();
        _this.excluded = _this.getExcludedRanges();
  
        if (_this.end - _this.start > 0) {
          if (_this.withinSingleDay()) {
            _this.minutes += _this.inDayCount(
                                              _this.start,
                                              _this.end,
                                              _this.beginningDay,
                                              _this.start - _this.startMID
                              );
          } else {
            _this.minutes += _this.inDayCount(
                                              _this.start,
                                              _this.start + WHOLE_DAY,
                                              _this.beginningDay,
                                              _this.start - _this.startMID
                              );
            _this.minutes += _this.inDayCount(
                                              _this.end - _this.endMID,
                                              _this.end,
                                              _this.endingDay,
                                              _this.end - _this.endMID
                              );
            _this.countTheRemainingDays_v2();
          }
        }
      });

      return {
        getMinutes: _this.getMinutes
      };
    }

    _this.getExcludedRanges = function() {
      var exc = _this.getConfig("except", []);
      var rs = [];
      var ilen = exc.length;
      for (var i = 0; i < ilen; i++) {
        var ranges = _this.splitRangeToInDayRanges(exc[i][0], exc[i][1]);
        var jlen = ranges.length;
        for (var j = 0; j < jlen; j++) {
          rs[rs.length] = ranges[j];
        }
      }
      return rs;
    }

    _this.splitRangeToInDayRanges = function(lowerBound, upperBound) {
      var lb = _this.getLocaleTime(lowerBound);
      var ub = _this.getLocaleTime(upperBound);

      if (lb >= ub || ! _this.related(lb, ub))
        return [];
      var day = lowerBound.getDay();
      var lbMID = _this.minuteInDay(lowerBound);
      if (day === 0) {
        lb += WHOLE_DAY - lbMID;
        day++;
      }
      if (day === 6) {
        lb += WHOLE_DAY - lbMID + WHOLE_DAY;
        day = 1;
      }
      var rs = [];
      while (lb < ub) {
        if (day !== 0 && day !== 6) {
          rs[rs.length] = lb + WHOLE_DAY < ub
                          ? [lb, lb + WHOLE_DAY]
                          : [lb, ub];
        }
        lb += WHOLE_DAY;
        day++;
        if (day > 6)
          day = 0;
      }
      return rs;
    }

    _this.related = function(lb, ub) {
      return (lb < _this.start && _this.start < ub)
          || (lb < _this.end && _this.end < ub)
          || (_this.start < lb && lb < _this.end)
          || (_this.start < ub && ub < _this.end)
    }

    _this.getConfig = function(key, fallback) {
      var cfg = _this.cfg;
      return cfg ? (cfg[key] || fallback) : fallback;
    }

    _this.getInRangeStart = function(baseStart) {
      var lowerBound = _this.getConfig("lowerBound", baseStart);
      return (_this.getLocaleTime(baseStart) < _this.getLocaleTime(lowerBound))
              ? lowerBound
              : baseStart;
    }

    _this.getInRangeEnd = function(baseEnd) {
      var upperBound = _this.getConfig("upperBound", baseEnd);
      if (_this.getLocaleTime(baseEnd) > _this.getLocaleTime(upperBound))
        return upperBound;
      return baseEnd;
    }

    _this.getLocaleTime = function(input) {
      return Math.floor( (input.getTime() - input.getTimezoneOffset()) / 60000 );
    }

    _this.withinSingleDay = function() {
      return _this.end - _this.start < WHOLE_DAY
          && _this.startMID <= _this.endMID;
    };

    _this.inDayCount = function(start, end, dayOfWeek, beginningOfDate) {
      if (dayOfWeek == 0 || dayOfWeek == 6)
        return 0;
      var countable = _this.getCountablePairs(start, end);
      var countableInMinutes = _this.toMinutes(countable, beginningOfDate);
      var len = countableInMinutes.length;
      var rs = 0;
      for (var i = 0; i < len; i++) {
        rs += _this.rangeCount(countableInMinutes[i][0], countableInMinutes[i][1]);
      }
      return rs;
    };

    _this.getCountablePairs = function(start, end) {
      var queue = [];
      queue[0] = [start, end];
      var ilen = _this.excluded.length;
      for (var i = 0; i < ilen; i++) {
        //console.log("excluded: ", i, _this.excluded[i], "queue: ", queue);
        var subQueue = [];
        var jlen = queue.length;
        for (var j = 0; j < jlen; j++) {
          //console.log("queue: ", j, queue[j], "subQueue: ", subQueue);
          var splitted = _this.getCountableRanges(queue[j], _this.excluded[i]);
          var klen = splitted.length;
          //console.log("splitted: ", splitted);
          for (var k = 0; k < klen; k++) {
            subQueue[subQueue.length] = splitted[k];
          }
        }
        queue = subQueue;
      }
      return queue;
    };

    _this.getCountableRanges = function(basePair, excludePair) {
      var a = basePair[0];
      var b = basePair[1];
      var x = excludePair[0];
      var y = excludePair[1];
      if (x <= a) {
        if (y <= a) {
          return [basePair];
        } else {
          if (y >= b) {
            return [];
          } else {
            return [[y, b]];
          }
        }
      } else {
        if (x >= b) {
          return [basePair];
        } else {
          if (y >= b) {
            return [[a, x]];
          } else {
            return [[a, x], [y, b]];
          }
        }
      }
    };

    _this.toMinutes = function(countable, beginningOfDate) {
      var rs = [];
      var len = countable.length;
      for (var i = 0; i < len; i++) {
        rs[rs.length] = [
                          countable[i][0] - beginningOfDate,
                          countable[i][1] - beginningOfDate
                        ];
      }
      return rs;
    };

    _this.rangeCount = function(startMID, endMID) {
      var startPhase = _this.phaseOfDay(startMID);
      var endPhase = _this.phaseOfDay(endMID);

      if (startPhase === endPhase && (
            startPhase === 1
        ||  startPhase === 3
        ||  startPhase === 5
      )) {
        // out of working hours
        return 0;
      }

      if (startPhase === 1 && endPhase === 5) {
        return ONE_DATE_MINUTES;
      }
      var countedMinute = 0;
      if (startPhase < 3)
        countedMinute += _this.morningCount(
                                startMID, startPhase, endMID, endPhase);
      if (endPhase > 3)
        countedMinute += _this.afternoonCount(
                                startMID, startPhase, endMID, endPhase);
      return Math.min(countedMinute, ONE_DATE_MINUTES);
    };

    _this.minuteInDay = function(date) {
      var minute = date.getHours()*60
                    + date.getMinutes();
      if (minute < 0)
        return WHOLE_DAY + minute;
      return minute;
    };

    _this.phaseOfDay = function(minuteInDay) {
      if (0 <= minuteInDay && minuteInDay <= 450)
        return 1;
      if (450 < minuteInDay && minuteInDay < 720)
        return 2;
      if (720 <= minuteInDay && minuteInDay <= 810)
        return 3;
      if (810 < minuteInDay && minuteInDay < 1170)
        return 4;
      if (minuteInDay >= 1170)
        return 5;
      return -1;
    };

    _this.morningCount = function(x, xp, y, yp) {
      if (xp === 1 && yp > 2) {
        return MORNING_MINUTES;
      }
      var lowerBound = Math.max(x, SEVEN_THIRTY);
      var upperBound = Math.min(y, TWELVE);
      return upperBound - lowerBound;
    };

    _this.afternoonCount = function(x, xp, y, yp) {
      if (yp === 5 && xp < 4) {
        return AFTERNOON_MINUTES;
      }
      var lowerBound = Math.max(x, THIRTEEN_THIRTY);
      var upperBound = Math.min(y, NINETEEN_THIRTY);
      return upperBound - lowerBound;
    };

    _this.countTheRemainingDays = function() {
      console.error("calling legacy code");
    };

    _this.countTheRemainingDays_v2 = function() {
      var weekDayIndicate = _this.beginningDay;
      var pot = _this.start + WHOLE_DAY - _this.startMID;
      var endPoint = _this.end - _this.endMID;

      while (pot < endPoint) {
        weekDayIndicate++;
        if (weekDayIndicate > 6) {
          weekDayIndicate = 0;
        }
        _this.minutes += _this.inDayCount(
                                            pot,
                                            pot + WHOLE_DAY,
                                            weekDayIndicate,
                                            pot
                          );
        pot += WHOLE_DAY;
      }
      
    }

    _this.format = function(srcMinutes) {
      var days = Math.floor(srcMinutes / ONE_DATE_MINUTES);
      var hours = Math.floor(srcMinutes / 60);
      var minutes = srcMinutes - hours*60;
      hours -= days*8;
      return days + 'd' + hours + 'h' + minutes + 'm';
    };

    _this.getMinutes = function() {
      return _this.minutes;
    };

    return {
      count: _this.count,
      format: _this.format
    };
  };

  window.kit = window.kit || {};
  window.kit.wdc = window.kit.wdc || new WorkingDateCounter();
})();

(function(){
  var _this = {};
  window.kit = window.kit || {};
  _this.wdc = window.kit.wdc;
  
  if ( ! _this.wdc) {
    window.alert("cout << wdc not found!");
    return;
  }

  _this.host = 'https://jira.axonivy.com/jira/rest/api/2';
  _this.subtaskURI = _this.host + '/issue/{x}/subtask';
  _this.taskDetailURI = _this.host + '/issue/{x}?expand=changelog';

  _this.test = false;

  _this.visit = function() {
    var nodes = document.querySelectorAll('a.js-key-link');
    if (nodes.length === 0) {
      window.alert('cout << no thing to show here!');
      return;
    }

    var len = nodes.length;
    for (var i = 0; i < len; i++) {
      _this.visitIssue(nodes[i]);
    }
  }

  _this.visitIssue = function(node) {
    var tag = document.createElement('span');
    tag.innerHTML = '&nbsp;><';
    tag.addEventListener('click', function() {
      _this.calculateIssue(tag, node.title);
    });
    node.parentNode.appendChild(tag);
  }

  _this.calculateIssue = function(el, key) {
    var link = _this.subtaskURI.replace('{x}', key);
    fetch(link)
    .then(function(e){
      return e.json();
    })
    .then(function(rs) {
      var subIssuesKeys = rs.map(function(e){return e.key;});
      var takenMinutes = 0;
      var len = subIssuesKeys.length;
      for (var i = 0; i < len; i++) {
        _this.calculateSubIssue(subIssuesKeys[i], function(taken){
          takenMinutes += taken;
          var displayTime = _this.wdc.format(takenMinutes);
          el.innerHTML = " > "+displayTime+" <";
        });
      }
    })
  }

  _this.calculateSubIssue = function(key, callback) {
    var link = _this.taskDetailURI.replace('{x}', key);
    fetch(link)
    .then(function(e){
      return e.json();
    })
    .then(function(rs){
      var statusHistories = _this.getStatusHistories(rs);
      var ranges = _this.getRanges(statusHistories);
      callback(_this.toMinutes(ranges));
    });
  }

  _this.getStatusHistories = function(response) {
    var result = [];
    var histories = response.changelog.histories;
    var len = histories.length;
    for (var i = 0; i < len; i++) {
      var statusItem = _this.getStatusItem(histories[i]);
      if (statusItem) {
        result[result.length] = statusItem
      }
    }
    return result;
  }

  _this.getStatusItem = function(historyItem) {
    var len = historyItem.items.length;
    for (var i = 0; i < len; i++) {
      if (historyItem.items[i].field === "status") {
        var cloned = JSON.parse(JSON.stringify(historyItem.items[i]));
        cloned['timestamp'] = historyItem.created;
        return cloned;
      }
    }
    return undefined;
  }

  _this.getRanges = function(statusHistories) {
    var result = [];
    var start = undefined;
    var len = statusHistories.length;
    for (var i = 0; i < len; i++) {
      if (statusHistories[i].to === "3") {
        start = statusHistories[i].timestamp;
      } else if (statusHistories[i].from === "3") {
        if (start) {
          result[result.length] = [start, statusHistories[i].timestamp];
          start = undefined;
        }
      }
    }
    return result;
  }

  _this.toMinutes = function(ranges) {
    var minutes = 0;
    var len = ranges.length;
    for (var i = 0; i < len; i++) {
      minutes += _this.wdc.count(
        new Date(ranges[i][0]), new Date(ranges[i][1])
      ).getMinutes();
    }
    return minutes;
  }

  _this.pin = function(tag, offset) {
    tag.style.position = 'fixed';
    tag.style.bottom = '0';
    tag.style.right = offset + 'px';
    tag.style['z-index'] = 100000;
    document.body.appendChild(tag);
  }

  _this.log = function(l) {
    var tag = document.createElement('TEXTAREA');
    tag.value = l;
    _this.pin(tag, 200);
  }

  var b = document.createElement('BUTTON')
  b.appendChild(document.createTextNode('Knock'));
  b.addEventListener('click', function(){
    _this.visit();
    document.body.removeChild(b);
    //_this.calculateIssue(b, 'AF-24020');
  });
  _this.pin(b, 0);
})();

