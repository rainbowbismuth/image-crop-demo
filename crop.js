function draw_all_images(source) {
    var image = document.createElement("img");
    image.crossOrigin = 'anonymous';
    image.src = source;
    image.onload = function () {
        var entropy = make_entropy_canvas(image);
        var draw_entropy_croppedped = draw_entropy_cropped(image);
        var div = draw_euphoria_style(image);
        image.style.width = window.innerHeight * 4 / 9 + 'px';
        image.style.height = 'auto';
        document.body.appendChild(div);
        document.body.appendChild(image);
        document.body.appendChild(entropy);
        document.body.appendChild(draw_entropy_croppedped);
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
var MAX_DISTANCE = 441;
var ColorDistHistogram = (function () {
    function ColorDistHistogram() {
        this.arr = new Uint32Array(MAX_DISTANCE);
    }
    ColorDistHistogram.prototype.reset = function () {
        var arr = this.arr;
        for (var i = 0; i < MAX_DISTANCE; i++) {
            arr[i] = 0;
        }
    };
    ColorDistHistogram.prototype.calculate = function (img_data, x, y, width, height) {
        var data = img_data.data;
        var arr = this.arr;
        var index = (function () {
            var row_length = img_data.width;
            return function (i, j) {
                return (i + j * row_length) * 4;
            };
        })();
        var last_x = x + width - 1;
        var last_y = y + height - 1;
        for (; y < last_y; y++) {
            for (; x < last_x; x++) {
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
                arr[dist] += 1;
            }
        }
    };
    ColorDistHistogram.prototype.total_entropy = function () {
        var total = 0;
        var arr = this.arr;
        for (var i = 0; i < MAX_DISTANCE; i++) {
            total += arr[i];
        }
        var sum = 0;
        for (var i = 0; i < MAX_DISTANCE; i++) {
            var p = (i * arr[i]) / total;
            if (p == 0)
                continue;
            sum += p * (Math.log(p) / Math.LOG2E);
        }
        return -sum;
    };
    return ColorDistHistogram;
})();
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
var draw_entropy_croppedpingControl = (function () {
    function draw_entropy_croppedpingControl(img_data) {
        this.img_data = img_data;
        this.histo = new ColorDistHistogram();
        this.x = 0;
        this.y = 0;
        this.width = img_data.width;
        this.height = img_data.height;
    }
    draw_entropy_croppedpingControl.prototype.entropy = function (slice_amount, x, y, width, height) {
        this.histo.calculate(this.img_data, x, y, width, height);
        var result = this.histo.total_entropy();
        this.histo.reset();
        return result;
    };
    draw_entropy_croppedpingControl.prototype.entropy_top = function (slice_amount) {
        return this.entropy(slice_amount, this.x, this.y, this.width, slice_amount);
    };
    draw_entropy_croppedpingControl.prototype.entropy_bottom = function (slice_amount) {
        return this.entropy(slice_amount, this.x, this.y + this.height - slice_amount, this.width, slice_amount);
    };
    draw_entropy_croppedpingControl.prototype.entropy_left = function (slice_amount) {
        return this.entropy(slice_amount, this.x, this.y, slice_amount, this.height);
    };
    draw_entropy_croppedpingControl.prototype.entropy_right = function (slice_amount) {
        return this.entropy(slice_amount, this.x + this.width - slice_amount, this.y, slice_amount, this.height);
    };
    draw_entropy_croppedpingControl.prototype.slice_top = function (slice_amount) {
        this.y += slice_amount;
        this.height -= slice_amount;
    };
    draw_entropy_croppedpingControl.prototype.slice_bottom = function (slice_amount) {
        this.height -= slice_amount;
    };
    draw_entropy_croppedpingControl.prototype.slice_left = function (slice_amount) {
        this.x += slice_amount;
        this.width -= slice_amount;
    };
    draw_entropy_croppedpingControl.prototype.slice_right = function (slice_amount) {
        this.width -= slice_amount;
    };
    return draw_entropy_croppedpingControl;
})();
function draw_entropy_cropped(img) {
    var canvas = document.createElement("canvas");
    var target = 250;
    var ratio = Math.max(img.naturalWidth, img.naturalHeight) / target;
    canvas.width = (img.naturalWidth / ratio) | 0;
    canvas.height = (img.naturalHeight / ratio) | 0;
    var ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    var img_data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    var draw_entropy_cropped_ctl = new draw_entropy_croppedpingControl(img_data);
    while (draw_entropy_cropped_ctl.height * 16 / 9 > draw_entropy_cropped_ctl.width) {
        var slice_amount = 4;
        var top_entropy = draw_entropy_cropped_ctl.entropy_top(slice_amount);
        var bottom_entropy = draw_entropy_cropped_ctl.entropy_bottom(slice_amount);
        if (top_entropy < bottom_entropy) {
            draw_entropy_cropped_ctl.slice_top(slice_amount);
        }
        else {
            draw_entropy_cropped_ctl.slice_bottom(slice_amount);
        }
    }
    while (draw_entropy_cropped_ctl.width * 9 / 16 > draw_entropy_cropped_ctl.height) {
        var slice_amount = 4;
        var left_entropy = draw_entropy_cropped_ctl.entropy_left(slice_amount);
        var right_entropy = draw_entropy_cropped_ctl.entropy_right(slice_amount);
        if (left_entropy < right_entropy) {
            draw_entropy_cropped_ctl.slice_left(slice_amount);
        }
        else {
            draw_entropy_cropped_ctl.slice_right(slice_amount);
        }
    }
    var result = document.createElement("canvas");
    if (img.naturalWidth * 9 / 16 > img.naturalHeight) {
        result.width = 272;
        result.height = (result.width * 9 / 16) | 0;
    }
    else {
        result.height = 152;
        result.width = (result.height * 16 / 9) | 0;
    }
    var resultCtx = result.getContext("2d");
    resultCtx.drawImage(img, (draw_entropy_cropped_ctl.x * ratio) | 0, (draw_entropy_cropped_ctl.y * ratio) | 0, (draw_entropy_cropped_ctl.width * ratio) | 0, (draw_entropy_cropped_ctl.height * ratio) | 0, 0, 0, result.width, result.height);
    result.style.maxWidth = 272 + 'px';
    result.style.height = 'auto';
    return result;
}
draw_all_images('./sample1.jpg');
draw_all_images('./sample2.jpg');
draw_all_images('./sample3.jpg');
draw_all_images('./sample4.jpg');
draw_all_images('./sample5.jpg');
draw_all_images('./sample6.jpg');
draw_all_images('./sample7.jpg');
draw_all_images('./sample8.png');
draw_all_images('./huge_sample1.jpg');
draw_all_images('./huge_sample2.jpg');
draw_all_images('./huge_sample3.jpg');
