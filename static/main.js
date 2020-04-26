
$(document).ready(function() {
    //Canvas
    var canvas = document.getElementById('sheet');
    var ctx = canvas.getContext('2d');
    //Variables
    var canvasx = $(canvas).offset().left;
    var canvasy = $(canvas).offset().top;
    var last_mousex = last_mousey = 0;
    var mousex = mousey = 0;
    var mousedown = false;
    var tooltype = 'draw';

    //Mousedown
    $(canvas).on('mousedown', function(e) {
        last_mousex = mousex = parseInt(e.clientX-canvasx);
        last_mousey = mousey = parseInt(e.clientY-canvasy);
        mousedown = true;
    });

    //Mouseup
    $(canvas).on('mouseup', function(e) {
        mousedown = false;
    });

    //Mousemove
    $(canvas).on('mousemove', function(e) {
        mousex = parseInt(e.clientX-canvasx);
        mousey = parseInt(e.clientY-canvasy);
        if(mousedown) {
            ctx.beginPath();
            if(tooltype=='draw') {
                ctx.globalCompositeOperation = 'source-over';
                ctx.strokeStyle = '#'+(Math.random()*0xFFFFFF<<0).toString(16);
                ctx.lineWidth = 10;
            } else {
                ctx.globalCompositeOperation = 'destination-out';
                ctx.lineWidth = 10;
            }
            ctx.moveTo(last_mousex,last_mousey);
            ctx.lineTo(mousex,mousey);
            ctx.lineJoin = ctx.lineCap = 'round';
            ctx.stroke();
        }
        last_mousex = mousex;
        last_mousey = mousey;
    });

    //Use draw|erase
    use_tool = function(tool) {
        tooltype = tool; //update
    }

    $("#clear").on('click', function () {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    });

    $('#content').on('change',function(e){
        //get the file name
        var fileName = e.target.files[0].name;
        //replace the "Choose a file" label
        $(this).next('.custom-file-label').html(fileName);
    })

    $("#demo").on('click', function () {
        document.getElementById('contenturl').value = 'https://thumbs-prod.si-cdn.com/d4e3zqOM5KUq8m0m-AFVxuqa5ZM=/800x600/filters:no_upscale():focal(554x699:555x700)/https://public-media.si-cdn.com/filer/a4/04/a404c799-7118-459a-8de4-89e4a44b124f/img_1317.jpg'
    });

    $("#combine").on('click', function () {
        var content = document.getElementById('contenturl').value
        var img  = canvas.toDataURL("image/png");

        $.ajax({
            type: 'POST',
            url: 'http://localhost:5000/transfer/',
            data: JSON.stringify({"content": content
                                    , "style": img}),
            contentType: 'application/json; charset=utf-8',
            dataType: 'json',
            success: function (result) {
                $("#contentimg").attr("src", result['content']);
                $('#styleimg').attr("src", result['style']);
                $("html, body").animate({ scrollTop: document.body.scrollHeight }, "slow");

            },
            error: function(result) {
            }
        });
        
    });

});