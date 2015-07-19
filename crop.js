function draw_all_images(source) {
    var image = document.createElement("img");
    image.crossOrigin = 'anonymous';
    image.src = source;
    image.onload = function () {
        var entropy = make_entropy_canvas(image);
        var centered = draw_center_of_edginess(image);
        var div = draw_euphoria_style(image);
        image.style.width = window.innerHeight * 4 / 9 + 'px';
        image.style.height = 'auto';
        document.body.appendChild(div);
        document.body.appendChild(image);
        document.body.appendChild(entropy);
        document.body.appendChild(centered);
        document.body.appendChild(document.createElement("br"));
    };
}
function draw_euphoria_style(img) {
    img = img.cloneNode(false);
    var div = document.createElement("div");
    var displayHeight = 153;
    var displayWidth = null;
    var ratio = img.naturalWidth / img.naturalHeight;
    if (ratio < 9 / 16) {
        displayWidth = 9 / 16 * displayHeight;
        img.style.width = displayWidth + 'px';
        img.style.height = 'auto';
    }
    else {
        displayWidth = img.naturalWidth * (displayHeight / img.naturalHeight);
    }
    div.appendChild(img);
    div.style.position = 'relative';
    div.style.height = 'auto';
    div.style.width = displayWidth + 'px';
    div.style.maxWidth = '272px';
    div.style.height = '153px';
    div.style.overflow = 'hidden';
    div.style.cssFloat = 'left';
    img.style.position = 'absolute';
    img.style.left = '0';
    img.style.top = '0';
    img.style.height = '100%';
    return div;
}
function center_of_edginess(img_data, y_param) {
    var data = img_data.data;
    var width = img_data.width;
    var height = img_data.height;
    var sum_x = 0;
    var sum_y = 0;
    var sum_edge = 0;
    for (var y = 0; y < height; y++) {
        for (var x = 0; x < width - 1; x++) {
            var here = (x + y * width) * 4;
            var r1 = data[here + 0];
            var g1 = data[here + 1];
            var b1 = data[here + 2];
            var here = (x + 1 + y * width) * 4;
            var r2 = data[here + 0];
            var g2 = data[here + 1];
            var b2 = data[here + 2];
            var r_squared = (r1 - r2) * (r1 - r2);
            var g_squared = (g1 - g2) * (g1 - g2);
            var b_squared = (b1 - b2) * (b1 - b2);
            var dist = Math.sqrt(r_squared + g_squared + b_squared);
            sum_x += (x + 1) * dist;
            sum_y += (y + 1) * dist;
            sum_edge += dist;
        }
    }
    var area = width * height;
    var adjusted = sum_edge / Math.pow(area, y_param);
    var r_x = sum_x / sum_edge;
    var r_y = sum_y / sum_edge;
    return {
        x: r_x, y: r_y, adjusted_average: adjusted
    };
}
function draw_center_of_edginess(img) {
    var canvas = document.createElement("canvas");
    var target = 250;
    var ratio = Math.max(img.naturalWidth, img.naturalHeight) / target;
    canvas.width = (img.naturalWidth / ratio) | 0;
    canvas.height = (img.naturalHeight / ratio) | 0;
    var ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    var img_data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    var coe = center_of_edginess(img_data, 0.2);
    var result = document.createElement("canvas");
    result.width = 272;
    result.height = 272;
    var closest = Math.min(coe.x, coe.y, canvas.width - coe.x, canvas.height - coe.y);
    var actual_x = (coe.x - closest) * ratio;
    var actual_y = (coe.y - closest) * ratio;
    var actual_width = (closest * 2) * ratio;
    var actual_height = (closest * 2) * ratio;
    var resultCtx = result.getContext("2d");
    resultCtx.drawImage(img, actual_x | 0, actual_y | 0, actual_width | 0, actual_height | 0, 0, 0, result.width, result.height);
    result.style.maxWidth = 272 + 'px';
    result.style.height = 'auto';
    return result;
}
var MAX_DISTANCE = 441;
function draw_entropy_map(img_data, out) {
    var data = img_data.data;
    var index = (function () {
        var row_length = img_data.width;
        return function (i, j) {
            return (i + j * row_length) * 4;
        };
    })();
    var last_x = img_data.width - 1;
    var last_y = img_data.height - 1;
    for (var y = 0; y < last_y; y++) {
        for (var x = 0; x < last_x; x++) {
            var here = index(x, y);
            var r1 = data[here + 0];
            var g1 = data[here + 1];
            var b1 = data[here + 2];
            var here = index(x + 1, y);
            var r2 = data[here + 0];
            var g2 = data[here + 1];
            var b2 = data[here + 2];
            var r_squared = (r1 - r2) * (r1 - r2);
            var g_squared = (g1 - g2) * (g1 - g2);
            var b_squared = (b1 - b2) * (b1 - b2);
            var dist = Math.sqrt(r_squared + g_squared + b_squared) | 0;
            var ratio = dist / MAX_DISTANCE;
            var color = Math.min(255, Math.pow(ratio, 0.9) * 256 | 0) | 0;
            here = index(x, y);
            out.data[here + 0] = color;
            out.data[here + 1] = color;
            out.data[here + 2] = color;
        }
    }
}
function make_entropy_canvas(img) {
    var canvas = document.createElement("canvas");
    var target = 250;
    var ratio = Math.max(img.naturalWidth, img.naturalHeight) / target;
    canvas.width = (img.naturalWidth / ratio) | 0;
    canvas.height = (img.naturalHeight / ratio) | 0;
    var ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    var img_data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    var out = ctx.getImageData(0, 0, canvas.width, canvas.height);
    draw_entropy_map(img_data, out);
    ctx.putImageData(out, 0, 0, 0, 0, canvas.width, canvas.height);
    return canvas;
}
draw_all_images('./sample1.jpg');
draw_all_images('./sample2.jpg');
draw_all_images('./sample3.jpg');
draw_all_images('./sample4.jpg');
draw_all_images('./sample5.jpg');
draw_all_images('./sample6.jpg');
draw_all_images('./sample7.jpg');
draw_all_images('./sample8.png');
draw_all_images('./sample9.jpg');
draw_all_images('./sample10.jpg');
draw_all_images('./huge_sample1.jpg');
draw_all_images('./huge_sample2.jpg');
draw_all_images('./huge_sample3.jpg');
