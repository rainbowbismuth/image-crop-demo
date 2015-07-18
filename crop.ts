function make_both(source: string) {
  var image: HTMLImageElement = document.createElement("img");
  image.crossOrigin = 'anonymous';
  image.src = source;
  image.onload = function() {
    var entropy: HTMLCanvasElement = make_entropy_canvas(image);
    var cropped: HTMLCanvasElement = crop(image);
    var div: HTMLDivElement = euphoria(image);

    image.style.width = window.innerHeight * 4 / 9 + 'px';
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
  if (ratio < 9 / 16) {
    displayWidth = 9 / 16 * displayHeight
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

class CroppingControl {
  constructor(img_data: ImageData) {
    this.img_data = img_data;
    this.histo = new_histogram();
    this.x = 0;
    this.y = 0;
    this.width = img_data.width;
    this.height = img_data.height;
  }

  public img_data: ImageData;
  private histo: Int32Array;
  public x: number;
  public y: number;
  public width: number;
  public height: number;

  entropy(slice_amount: number, x: number, y: number, width: number, height: number): number {
    calculate_histogram(this.histo, this.img_data, x, y, width, height);
    var result = total_entropy(this.histo);
    reset_histogram(this.histo)
    return result;
  }

  entropy_top(slice_amount: number): number {
    return this.entropy(
      slice_amount,
      this.x,
      this.y,
      this.width,
      slice_amount);
  }

  entropy_bottom(slice_amount: number): number {
    return this.entropy(
      slice_amount,
      this.x,
      this.y + this.height - slice_amount,
      this.width,
      slice_amount);
  }

  entropy_left(slice_amount: number): number {
    return this.entropy(
      slice_amount,
      this.x,
      this.y,
      slice_amount,
      this.height);
  }

  entropy_right(slice_amount: number): number {
    return this.entropy(
      slice_amount,
      this.x + this.width - slice_amount,
      this.y,
      slice_amount,
      this.height);
  }

  slice_top(slice_amount: number): void {
    this.y += slice_amount;
    this.height -= slice_amount;
  }

  slice_bottom(slice_amount: number): void {
    this.height -= slice_amount;
  }

  slice_left(slice_amount: number): void {
    this.x += slice_amount;
    this.width -= slice_amount;
  }

  slice_right(slice_amount: number): void {
    this.width -= slice_amount;
  }
}

function crop(img: HTMLImageElement): HTMLCanvasElement {
  var canvas: HTMLCanvasElement = document.createElement("canvas");

  var target = 250; //window.screen.width / 8;
  var ratio = img.naturalWidth / target;
  canvas.width = (img.naturalWidth / ratio) | 0;
  canvas.height = (img.naturalHeight / ratio) | 0;

  var ctx: CanvasRenderingContext2D = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  var img_data: ImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  var crop_ctl = new CroppingControl(img_data);

  while (crop_ctl.height * 16 / 9 > crop_ctl.width) {
    var slice_amount = 5

    var top_entropy = crop_ctl.entropy_top(slice_amount);
    var bottom_entropy = crop_ctl.entropy_bottom(slice_amount);

    if (top_entropy < bottom_entropy) {
      crop_ctl.slice_top(slice_amount);
    } else {
      crop_ctl.slice_bottom(slice_amount);
    }
  }

  while (crop_ctl.width * 9 / 16 > crop_ctl.height) {
    var slice_amount = 5

    var left_entropy = crop_ctl.entropy_left(slice_amount);
    var right_entropy = crop_ctl.entropy_right(slice_amount);

    if (left_entropy < right_entropy) {
      crop_ctl.slice_left(slice_amount);
    } else {
      crop_ctl.slice_right(slice_amount);
    }
  }

  var result: HTMLCanvasElement = document.createElement("canvas");
  if (img.naturalWidth * 9 / 16 > img.naturalHeight) {
    result.width = 272;
    result.height = (result.width * 9 / 16) | 0;
  } else {
    result.height = 152;
    result.width = (result.height * 16 / 9) | 0;
  }

  var resultCtx: CanvasRenderingContext2D = result.getContext("2d");
  resultCtx.drawImage(
    img,
    (crop_ctl.x * ratio) | 0,
    (crop_ctl.y * ratio) | 0,
    (crop_ctl.width * ratio) | 0,
    (crop_ctl.height * ratio) | 0,
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
