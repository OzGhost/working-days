
var tag = document.getElementById("trigger");
tag.addEventListener('click', function(){
  var con = document.getElementById("cfg-container");
  if (con.className === "open") {
    con.className = "";
  } else {
    con.className = "open";
  }
});

