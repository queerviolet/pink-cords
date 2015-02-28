$(document).mousemove(function(e){
    var $width = ($(document).width())/255;
    var $height = ($(document).height())/255;
    var $pageX = parseInt(e.pageX / $width,10);
    var $pageY = parseInt(e.pageY / $height,10);
    var nodeKlass = document.getElementsByClassName("node")
    $(nodeKlass).css("fill", "rgb("+$pageX+","+$pageY+","+$pageX+")");
});