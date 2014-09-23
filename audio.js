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

context = new AudioContext();

mp3 = context.createBufferSource();
soundURL = 'daft-doin-it-right.mp3'
request = new XMLHttpRequest();
request.open('GET', soundURL, true);
request.responseType = 'arraybuffer';
request.onreadystatechange = function() {
  if (request.readyState === 4 && request.status === 200) {
    data = request.response;
    context.decodeAudioData(data, function(buffer) {
      mp3.buffer = buffer
    }, function(error) {
      console.log('Error decoding audio data from', soundURL, '-', error.err);
    });
  }
}
request.send();

gainNode = context.createGain();
gainNode.gain.value = 5;

filterNode = context.createBiquadFilter();
filterNode.type = 'notch';

compressorNode = context.createDynamicsCompressor();

analyserNode = context.createAnalyser();

nodes = [
  mp3,
  gainNode,
  filterNode,
  compressorNode,
  analyserNode,
  context.destination
]

// Connect nodes
for (i = 0; i < nodes.length; i++) {
  nextNode = nodes[i + 1];
  if (nextNode !== undefined) {
    nodes[i].connect(nextNode);
  }
}

mp3.playbackRate.value = 0.9
filterNode.detune.value = 1200*12

mp3.start();

j = 200;

function draw(time) {
  canvas$ = $('#musicCanvas');
  drawContext = canvas$[0].getContext("2d");
  drawContext.clearRect(0, 0, canvas$.width(), canvas$.height());

  freqDomain = new Uint8Array(analyserNode.frequencyBinCount);
  analyserNode.getByteTimeDomainData(freqDomain);
  /*
  for (var i = 0; i < analyserNode.frequencyBinCount; i++) {
      val = freqDomain[i];
      red = val;
      green = Math.round(Math.abs(Math.sin(val) * 255));
      blue = val / 2;
      drawContext.fillStyle = 'rgb(' + red + ', ' + green + ', ' + blue + ')';
      drawContext.fillRect(i * 2, 0, 2, canvas$.height());
  }
  */

  drawContext.moveTo(canvas$.width()/2, canvas$.height()/2);
  for (i=0; i < j; i++) {
    angle = 0.1 * i;
    x=(1+angle)*Math.cos(angle);
    y=(1+angle)*Math.sin(angle);
    drawContext.lineTo(canvas$.width()/2 + x, y);
  }
  drawContext.strokeStyle = '#000';
  drawContext.stroke();
  j++;

  /*
  freqDomain = new Uint8Array(analyserNode.frequencyBinCount);
  analyserNode.getByteFrequencyData(freqDomain);
  for (var i = 0; i < analyserNode.frequencyBinCount; i++) {
    value = freqDomain[i];
    percent = value / 256;
    height = 360 * percent;
    offset = 360 - height - 1;
    barWidth = 640/analyserNode.frequencyBinCount;
    hue = i/analyserNode.frequencyBinCount * 360;
    drawContext.fillStyle = 'hsl(' + hue + ', 100%, 50%)';
    drawContext.fillRect(i * barWidth, offset, barWidth, height);
  }
  */

  requestAnimationFrame(draw);
};
draw();
