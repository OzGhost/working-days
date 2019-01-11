
"use strict";
(function(){
  chrome.storage.local.get(["cfg"], function(storage) {
    var rawCfg = storage.cfg || {};

    function IDProvider() {
      var _this = this;
      _this.next = function(){
        var keys = Object.keys(rawCfg.excepts);
        var len = keys.length;
        var max = 0;
        for (var i = 0; i < len; i++) {
          var keyNumber = +keys[i];
          if (keyNumber > max) {
            max = keyNumber;
          }
        }
        return ''+(max+1);
      };
      return {
        next: _this.next
      };
    };
  
    var IDProvider = new IDProvider();
    
    var baseBody = ''
        +'<div class="fixed-frame">'
          +'<div class="cfg-header">'
            +'<p class="cfg-header__title">WDC Configuration</p>'
            +'<span class="cfg-header__trigger">CFG</span>'
          +'</div>'
          +'<div class="cfg-body">'
            +'<div class="cfg-half">'
              +'<div class="cfg-input-block">'
                +'<label>Lower bound:</label>'
                +'<input type="text" id="lower_bound"/>'
              +'</div>'
              +'<div class="cfg-input-block">'
                +'<label>Upper bound:</label>'
                +'<input type="text" id="upper_bound"/>'
              +'</div>'
            +'</div>'
            +'<div class="cfg-input-block">'
              +'<label>Except(s):</label>'
              +'<ul id="cfg-excepts">'
              +'</ul>'
            +'</div>'
          +'</div>'
          +'<div class="cfg-footer">'
            +'<div class="ctrl-buttons">'
              +'<button id="rollback">Cancel</button>'
              +'<button id="commit">Save</button>'
            +'</div>'
          +'</div>'
        +'</div>'
    ;
  
    var baseExceptionInputBlock = ''
      +'<div class="cfg-except__input-block">'
        +'<div class="cfg-input-block">'
          +'<label>From:</label>'
          +'<input type="text" id="except_from"/>'
        +'</div>'
        +'<div class="cfg-input-block">'
          +'<label>To:</label>'
          +'<input type="text" id="except_to"/>'
        +'</div>'
        +'<div class="cfg-except__btn">'
          +'<button id="except_commit">+</button>'
        +'</div>'
      +'</div>'
    ;
  
    function render(rawCfg) {
      var cfg = cook(rawCfg);
      var container = document.createElement('DIV');
      container.id = 'cfg-container';
      container.innerHTML = baseBody;
      container.querySelector(".cfg-header").addEventListener('click', function(){
        if (container.className === "open") {
          container.className = "";
        } else {
          container.className = "open";
        }
      });
      loadBoundaries(container, cfg);
      renderExceptions(container, cfg);
      attachCancelListener(container);
      attachSaveListener(container);
      document.body.appendChild(container);
    };
  
    function cook(rawCfg) {
      return {
        lowerBound: rawCfg.lowerBound ? new Date(rawCfg.lowerBound) : undefined,
        upperBound: rawCfg.upperBound ? new Date(rawCfg.upperBound) : undefined,
        excepts: cookExceptions(rawCfg.excepts)
      };
    };
  
    function cookExceptions(rawExceptions) {
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
  
    function loadBoundaries(container, cfg) {
      container.querySelector("#lower_bound").value = dateFormat(cfg.lowerBound);
      container.querySelector("#upper_bound").value = dateFormat(cfg.upperBound);
    };
  function dateFormat(inDate) {
      if ( ! inDate) {
        return "";
      }
      return inDate.getFullYear() + '-'
            + twoDigit(1+inDate.getMonth()) + '-'
            + twoDigit(inDate.getDate()) + ' '
            + twoDigit(inDate.getHours()) + ':'
            + twoDigit(inDate.getMinutes()) + ':'
            + twoDigit(inDate.getSeconds());
    };
  
    function twoDigit(normal) {
      return normal < 10 ? ('0'+normal) : normal;
    };
  
    function renderExceptions(container, cfg) {
      var exceptionsBox = container.querySelector("#cfg-excepts");
      exceptionsBox.innerHTML = "";
      var entries = Object.entries(cfg.excepts);
      var len = entries.length;
      for (var i = 0; i < len; i++) {
        exceptionsBox.appendChild(renderException(entries[i], function(exceptId){
          removeException(exceptId);
          renderExceptions(container, cook(rawCfg));
        }));
      }
      exceptionsBox.appendChild(renderExceptInputs(container));
    };
  
    function renderException(exceptionEl, removeCallback) {
      var line = document.createElement("P");
      line.innerHTML = dateFormat(exceptionEl[1][0])
                        + "<span> to </span>"
                        + dateFormat(exceptionEl[1][1]);
      var removeBtn = document.createElement("SPAN");
      removeBtn.innerHTML = "&times;";
      removeBtn.addEventListener("click", function(){
        removeCallback(exceptionEl[0]);
      });
      var wrapper = document.createElement("DIV");
      wrapper.className = "cfg-except__el";
      wrapper.appendChild(line);
      wrapper.appendChild(removeBtn);
      var tag = document.createElement("LI");
      tag.appendChild(wrapper);
      return tag;
    };
  
    function removeException(exceptId) {
      var nextExceptions = {};
      var entries = Object.entries(rawCfg.excepts);
      var len = entries.length;
      for (var i = 0; i < len; i++) {
        if (entries[i][0] !== exceptId) {
          nextExceptions[entries[i][0]] = entries[i][1];
        }
      }
      rawCfg.excepts = nextExceptions;
    };
  
    function renderExceptInputs(container) {
      var exceptInputBlock = document.createElement("LI");
      exceptInputBlock.innerHTML = baseExceptionInputBlock;
      var exceptFrom = exceptInputBlock.querySelector("#except_from");
      var exceptTo = exceptInputBlock.querySelector("#except_to");
      exceptFrom.value = dateFormat(new Date());
      exceptTo.value = exceptFrom.value;
      exceptInputBlock.querySelector("#except_commit")
        .addEventListener("click", function(){
          rawCfg.excepts[IDProvider.next()] = [exceptFrom.value, exceptTo.value];
          renderExceptions(container, cook(rawCfg));
        });
      return exceptInputBlock;
    };
  
    function attachCancelListener(container) {
      var cancelBtn = container.querySelector("#rollback");
      cancelBtn.addEventListener("click", function() {
        container.className = "";
      });
    };
  
    function attachSaveListener(container) {
      var saveBtn = container.querySelector("#commit");
      saveBtn.addEventListener("click", function() {
        var cfg = grapInputValues(container);
        pushBack(cfg);
        container.className = "";
      });
    }
  
    function grapInputValues(container) {
      var rs = {};
      rs["lowerBound"] = container.querySelector("#lower_bound").value;
      rs["upperBound"] = container.querySelector("#upper_bound").value;
      return rs;
    }
  
    function pushBack(cfg) {
      rawCfg.lowerBound = cfg.lowerBound;
      rawCfg.upperBound = cfg.upperBound;
      store(rawCfg);
    }
  
    function store(cfg) {
      chrome.storage.local.set({"cfg": cfg});
    }
  
    render(rawCfg);
  });
})();
  
