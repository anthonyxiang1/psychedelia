$(document).ready(function () {
  //Canvas
  var canvas = document.getElementById("sheet");
  var ctx = canvas.getContext("2d");
  //Variables
  var canvasx = $(canvas).offset().left;
  var canvasy = $(canvas).offset().top;
  var last_mousex = (last_mousey = 0);
  var mousex = (mousey = 0);
  var mousedown = false;
  var tooltype = "draw";

  function getMousePos(canvas, evt) {
    var rect = canvas.getBoundingClientRect();
    return {
      x: evt.clientX - rect.left,
      y: evt.clientY - rect.top
    };
  }
  $(window).on("resize", function (e) {
    var container = $(canvas).parent();
    if (window.innerWidth > 800) {
      $(canvas).attr("width", $(container).width() + 30); // canvas max width
    }
  });
  //Mousedown
  $(canvas).on("mousedown", function (e) {
    let pos = getMousePos(canvas, e);
    last_mousex = mousex = parseInt(pos.x);
    last_mousey = mousey = parseInt(pos.y);
    mousedown = true;
  });

  //Mouseup
  $(canvas).on("mouseup", function (e) {
    mousedown = false;
  });

  //Mousemove
  $(canvas).on("mousemove", function (e) {
    if ($("#style1").is(":checked")) {
      ctx.strokeStyle = "#" + ((Math.random() * 0xffffff) << 0).toString(16);
    }
    if ($("#style2").is(":checked")) {
      var img = new Image();
      img.src = "static/style/tile2.jpg";
      ctx.strokeStyle = ctx.createPattern(img, "repeat");
    }
    if ($("#style3").is(":checked")) {
      var img = new Image();
      img.src = "static/style/trippy.jpg";
      ctx.strokeStyle = ctx.createPattern(img, "repeat");
    }
    let pos = getMousePos(canvas, e);
    mousex = parseInt(pos.x);
    mousey = parseInt(pos.y);
    if (mousedown) {
      ctx.beginPath();
      if (tooltype == "draw") {
        ctx.globalCompositeOperation = "source-over";
        ctx.lineWidth = 10;
      }
      ctx.moveTo(last_mousex, last_mousey);
      ctx.lineTo(mousex, mousey);
      ctx.lineJoin = ctx.lineCap = "round";
      ctx.stroke();
    }
    last_mousex = mousex;
    last_mousey = mousey;
  });

  //Use draw|erase
  use_tool = function (tool) {
    tooltype = tool; //update
  };

  $("#clear").on("click", function () {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  });

  $("#content").on("change", function (e) {
    //get the file name
    var fileName = e.target.files[0].name;
    //replace the "Choose a file" label
    $(this).next(".custom-file-label").html(fileName);
  });

  $("#psych").on("click", function () {
    var img = new Image();
    img.src = "static/style/color.jpeg";
    img.onload = function () {
      var pattern = ctx.createPattern(img, "repeat");
      ctx.fillStyle = pattern;
      ctx.fillRect(0, 0, img.width, img.height);
    };
  });

  $("#lines").on("click", function () {
    var img = new Image();
    img.src = "static/style/line.jpg";
    img.onload = function () {
      var pattern = ctx.createPattern(img, "repeat");
      ctx.fillStyle = pattern;
      ctx.fillRect(0, 0, 800, 400);
    };
  });

  $("#nightlight").on("click", function () {
    var img = new Image();
    img.src = "static/style/nightlight.jpg";
    img.onload = function () {
      var pattern = ctx.createPattern(img, "repeat");
      ctx.fillStyle = pattern;
      ctx.fillRect(0, 0, img.width, img.height);
    };
  });

  $("#demo").on("click", function () {
    document.getElementById("contenturl").value =
      "https://thenypost.files.wordpress.com/2019/12/cat.jpg?quality=80&strip=all";
    var img = new Image();
    img.src = "static/style/color.jpeg";
    img.onload = function () {
      var pattern = ctx.createPattern(img, "repeat");
      ctx.fillStyle = pattern;
      ctx.fillRect(0, 0, 800, 400);
    };
  });

  $("#combine").on("click", function () {
    var steps = document.getElementById("steps").value;
    var content = document.getElementById("contenturl").value;
    var img = canvas.toDataURL("image/png");

    $("#loader").show();

    $.ajax({
      type: "POST",
      url: "https://psychedelia.herokuapp.com/transfer/",
      data: JSON.stringify({ content: content, style: img, steps : steps }),
      contentType: "application/json; charset=utf-8",
      dataType: "json",
      success: function (result) {
        // remove the images used from server
        $.ajax({
          type: "POST",
          url: "https://psychedelia.herokuapp.com/reset/",
          data: JSON.stringify({
            content_path: result["contentResize"],
            final_path: result["final"]
          }),
          contentType: "application/json; charset=utf-8",
          dataType: "json"
        });

        $("#loader").hide();

        // update the divs to show results
        $("h2#transfercomplete").html("Transfer Completed!");
        $("#contentimg").attr("src", "." + result["contentResize"]);
        $("#styleimg").attr("src", "." + result["final"]);
        $("html, body").animate(
          { scrollTop: document.body.scrollHeight },
          "slow"
        );
      },
      error: function (result) {
        console.log("error found!");
      }
    });
  });
});
