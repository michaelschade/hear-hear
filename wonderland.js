navigator.getUserMedia = navigator.getUserMedia ||
                         navigator.webkitGetUserMedia ||
                         navigator.mozGetUserMedia ||
                         navigator.msGetUserMedia;

window.requestAnimationFrame = (function(){
  return window.requestAnimationFrame  ||
    window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame    ||
    window.oRequestAnimationFrame      ||
    window.msRequestAnimationFrame     ||
    function(callback){
      window.setTimeout(callback, 1000 / 60);
  };
})();

var Wonderland = Wonderland || {
  canvas$: $('#wonderlandCanvas'),
  canvasContext: $('#wonderlandCanvas')[0].getContext('2d'),

  video$: $('#wonderlandVideo'),

  audioContext: new AudioContext(),
  audioSource: null,
  analyser: null,
  compressor: null,

  init: function(stream, audioBuffer) {
    this.canvas$[0].width = this.canvas$.width();
    this.canvas$[0].height = this.canvas$.height();

    // audio
    if (typeof audioBuffer !== 'undefined') {
      this.audioSource = this.audioContext.createBufferSource();
      this.audioSource.buffer = audioBuffer;
      this.audioSource.playbackRate.value = 1.2;
      this.audioSource.start();
    } else {
      this.audioSource = this.audioContext.createMediaStreamSource(stream);
    }

    // output piping
    this.analyser = this.audioContext.createAnalyser();
    this.compressor = this.audioContext.createDynamicsCompressor();
    this.audioSource.connect(this.compressor)
    this.compressor.connect(this.analyser);
    this.analyser.connect(this.audioContext.destination);

    // video
    this.video$.attr('src', window.URL.createObjectURL(stream));

    this.drawLoop();
  },

  drawLoop: function() {
    this.canvasContext.clearRect(0, 0, this.canvas$.width(), this.canvas$.height());
    this.canvasContext.drawImage(this.video$[0], 0, 0, this.canvas$.width(), this.canvas$.height());
    this.twiddleVideo();
    this.drawFrequencyGraph();
    requestAnimationFrame(this.drawLoop.bind(this));
  },

  drawFrequencyGraph: function() {
    freqDomain = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(freqDomain);
    for (i = 0; i < this.analyser.frequencyBinCount; i++) {
      value = freqDomain[i];
      percent = value / 256;
      height = this.canvas$.height() * percent;
      offset = this.canvas$.height() - height - 1;
      barWidth = this.canvas$.width()/this.analyser.frequencyBinCount;
      hue = i/this.analyser.frequencyBinCount * 360;
      this.canvasContext.fillStyle = 'hsl(' + hue + ', 100%, 80%)';
      this.canvasContext.fillRect(i*barWidth, offset, barWidth, height);
    }
  },

  twiddleVideo: function() {
    imageData = this.canvasContext.getImageData(0, 0, this.canvas$.width(), this.canvas$.height());
    data = imageData.data;
    freqDomain = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(freqDomain);
    columnSize = Math.floor(imageData.width / 8);
    rowSize = Math.floor(imageData.height / 8);
    /*
    for (column = 0; column < imageData.width; column += columnSize) {
      for (row = 0; row < imageData.height; row += rowSize) {
        progress = column/imageData.width;
        hue = progress * 360;
        saturation = 40 + 100*freqDomain[(row + column) % this.analyser.frequencyBinCount]/256;
        this.canvasContext.fillStyle = 'hsl(' + hue + ', ' + saturation + '%, 80%)';
        this.canvasContext.fillRect(column+2, row+2, columnSize-2, rowSize-2);
      }
    }
    */
    for (i = 0; i < data.length; i += 4) {
      r = i; g = i + 1; b = i + 2; a = i + 3;
      data[r] = Math.min(255, data[r] * 2) * freqDomain[r % this.analyser.frequencyBinCount];
      data[g] = data[g] + freqDomain[2*g % this.analyser.frequencyBinCount];
      data[b] = data[b] + freqDomain[8*b % this.analyser.frequencyBinCount];
      data[a] = 90 * freqDomain[r*g*b % this.analyser.frequencyBinCount];
    }
    this.canvasContext.putImageData(imageData, 0, 0);
  },

  invertVideo: function() {
    imageData = this.canvasContext.getImageData(0, 0, this.canvas$.width(), this.canvas$.height());
    data = imageData.data;
    for (i = 0; i < data.length; i += 4) {
      r = i; g = i + 1; b = i + 2; a = i + 3;
      data[r] = Math.min(255, data[r] * 2) * freqDomain[r];
      data[g] = data[g] * freqDomain[g];
      data[b] = data[b] * freqDomain[b];
      data[a] = 150;
    }
    this.canvasContext.putImageData(imageData, 0, 0);
  }
};

url = 'daft-computerized.mp3'
request = new XMLHttpRequest();
request.open('GET', url, true);
request.responseType = 'arraybuffer';
request.onreadystatechange = function() {
  if (request.readyState === 4 && request.status === 200) {
    data = request.response;
    Wonderland.audioContext.decodeAudioData(data, function(buffer) {
      setupStream(buffer);
    }, function(error) {
      console.error('Could not decode audio data from', url, '-', error.err);
    });
  }
}
request.send();

function setupStream(buffer) {
  if (!!navigator.getUserMedia) {
    navigator.getUserMedia({
      audio: true,
      video: true
    }, function(stream) {
      Wonderland.init(stream, buffer);
    }, function(error) {
      console.error('Could not retrieve stream from getUserMedia()');
    });
  } else {
    console.error('Browser does not support getUserMedia()');
  }
}
