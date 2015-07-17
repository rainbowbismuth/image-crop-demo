function make_both(source: string) {
  var image: HTMLImageElement = document.createElement("img");
  image.crossOrigin = 'anonymous';
  image.src = source;
  image.onload = function() {
    var entropy: HTMLCanvasElement = make_entropy_canvas(image);
    var cropped: HTMLCanvasElement = crop(image);
    var div: HTMLDivElement = euphoria(image);

    image.style.width = window.innerHeight * 4/9 + 'px';
    image.style.height = 'auto';

    document.body.appendChild(div);
    document.body.appendChild(image);
    document.body.appendChild(entropy);
    document.body.appendChild(cropped);
    document.body.appendChild(document.createElement("br"));
  }
}

function euphoria(img: HTMLImageElement): HTMLDivElement {
  img = <HTMLImageElement>img.cloneNode(false);

  var div: HTMLDivElement = document.createElement("div");

  var displayHeight = 153; //window.innerHeight
  var displayWidth: number = null;
  var ratio = img.naturalWidth / img.naturalHeight
  if (ratio < 9/16) {
    displayWidth = 9/16 * displayHeight
    img.style.width = displayWidth + 'px'
    img.style.height = 'auto'
  } else {
    displayWidth = img.naturalWidth * (displayHeight / img.naturalHeight)
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

const MAX_DISTANCE: number = 441;

function new_histogram(): Int32Array {
  return new Uint32Array(MAX_DISTANCE);
}

function reset_histogram(histo: Int32Array) {
  for (var i = 0; i < MAX_DISTANCE; i++) {
    histo[i] = 0;
  }
}

function calculate_histogram(histo: Int32Array, img_data: ImageData, x: number, y: number, width: number, height: number) {
  var data = img_data.data;

  var index = (function() {
    var row_length = img_data.width;

    return function(i: number, j: number): number {
      return (i + j * row_length) * 4;
    }
  })();

  var last_x = x + width - 1;
  var last_y = y + height - 1;

  for (; y < last_y; y++) {
    for (; x < last_x; x++) {
      var here = index(x, y);
      var r1   = data[here + 0];
      var g1   = data[here + 1];
      var b1   = data[here + 2];

      var here = index(x + 1, y);
      var r2   = data[here + 0];
      var g2   = data[here + 1];
      var b2   = data[here + 2];

      var r_squared = (r1 - r2) * (r1 - r2);
      var g_squared = (g1 - g2) * (g1 - g2);
      var b_squared = (b1 - b2) * (b1 - b2);
      var dist = Math.sqrt(r_squared + g_squared + b_squared)|0;

      histo[dist] += 1;
    }
  }

  return histo;
}

function draw_entropy(img_data: ImageData, out: ImageData) {
  var data = img_data.data;

  var index = (function() {
    var row_length = img_data.width;

    return function(i: number, j: number): number {
      return (i + j * row_length) * 4;
    }
  })();

  var last_x = img_data.width - 1;
  var last_y = img_data.height - 1;
  for (var y = 0; y < last_y; y++) {
    for (var x = 0; x < last_x; x++) {
      var here = index(x, y);
      var r1   = data[here + 0];
      var g1   = data[here + 1];
      var b1   = data[here + 2];

      var here = index(x + 1, y);
      var r2   = data[here + 0];
      var g2   = data[here + 1];
      var b2   = data[here + 2];

      var r_squared = (r1 - r2) * (r1 - r2);
      var g_squared = (g1 - g2) * (g1 - g2);
      var b_squared = (b1 - b2) * (b1 - b2);
      var dist = Math.sqrt(r_squared + g_squared + b_squared)|0;

      var ratio = dist / MAX_DISTANCE;
      var color = Math.min(255, Math.pow(ratio, 0.9)*256|0)|0;

      here = index(x, y);
      out.data[here+0] = color;
      out.data[here+1] = color;
      out.data[here+2] = color;
    }
  }
}

function make_entropy_canvas(img: HTMLImageElement): HTMLCanvasElement {
  var canvas: HTMLCanvasElement = document.createElement("canvas");

  var target = 250 //window.screen.width / 8;
  var ratio = img.naturalWidth / target;
  canvas.width = img.naturalWidth / ratio;
  canvas.height = img.naturalHeight / ratio;

  var ctx: CanvasRenderingContext2D = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  var img_data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  var out = ctx.getImageData(0, 0, canvas.width, canvas.height);
  draw_entropy(img_data, out);
  ctx.putImageData(out, 0, 0, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function total_entropy(histo: Int32Array): number {
  var total = 0;
  for (var i = 0; i < MAX_DISTANCE; i++) {
    total += histo[i];
  }

  var sum = 0;
  for (var i = 0; i < MAX_DISTANCE; i++) {
    var p = (i * histo[i]) / total;
    if (p == 0) continue;
    sum += p * (Math.log(p) / Math.LOG2E);
  }

  return -sum;
}

function crop(img: HTMLImageElement): HTMLCanvasElement {
  var canvas: HTMLCanvasElement = document.createElement("canvas");

  var target = 250; //window.screen.width / 8;
  var ratio = img.naturalWidth / target;
  canvas.width = (img.naturalWidth / ratio)|0;
  canvas.height = (img.naturalHeight / ratio)|0;

  var ctx: CanvasRenderingContext2D = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  var img_data: ImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  var cur_width = canvas.width;
  var cur_height = canvas.height;
  var cur_x = 0;
  var cur_y = 0;

  var histo = new_histogram();

  while (cur_height * 16/9 > cur_width) {
    var slice_amount = 5

    calculate_histogram(histo, img_data, cur_x, cur_y, cur_width, slice_amount);
    var top_entropy = total_entropy(histo);
    reset_histogram(histo);

    calculate_histogram(histo, img_data, cur_x, cur_y + cur_height - slice_amount, cur_width, slice_amount);
    var bottom_entropy = total_entropy(histo);
    reset_histogram(histo);

    if (top_entropy < bottom_entropy) {
      cur_y += slice_amount;
    }
    cur_height -= slice_amount;
  }

  while (cur_width * 9/16 > cur_height) {
    var slice_amount = 5

    calculate_histogram(histo, img_data, cur_x, cur_y, slice_amount, cur_height);
    var left_entropy = total_entropy(histo);
    reset_histogram(histo);

    calculate_histogram(histo, img_data, cur_x + cur_width - slice_amount, cur_y, slice_amount, cur_height);
    var right_entropy = total_entropy(histo);
    reset_histogram(histo);

    if (left_entropy < right_entropy) {
      cur_x += slice_amount;
    }
    cur_width -= slice_amount;
  }

  var result: HTMLCanvasElement = document.createElement("canvas");
  if (img.naturalWidth * 9/16 > img.naturalHeight) {
    result.width = 272;
    result.height = (result.width * 9/16)|0;
  } else {
    result.height = 152;
    result.width = (result.height * 16/9)|0;
  }

  var resultCtx: CanvasRenderingContext2D = result.getContext("2d");
  resultCtx.drawImage(img,
    (cur_x * ratio)|0, (cur_y * ratio)|0, (cur_width * ratio)|0, (cur_height * ratio)|0,
    0, 0, result.width, result.height);

  result.style.maxWidth = 272 + 'px';
  result.style.height = 'auto';
  return result;
}

make_both('./sample1.jpg');
make_both('./sample2.jpg');
make_both('./sample3.jpg');
make_both('./sample4.jpg');
make_both('./sample5.jpg');
make_both('./sample6.jpg');
make_both('./sample7.jpg');
make_both('./sample8.png');
make_both('./huge_sample1.jpg');
make_both('./huge_sample2.jpg');
make_both('./huge_sample3.jpg');
