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
  // audio components
  audioContext: new AudioContext(),
  audioSource: null,
  audioGain: null,
  analyser: null,
  compressor: null,

  // webgl components
  scene: null,
  camera: null,
  renderer: null,
  cubes: [],

  init: function(type, source) {
    this.initAudio(type, source);
    this.initScene();
    this.renderLoop();
  },

  initAudio: function(type, source) {
    // audio source
    if (type == 'buffer') {
      this.audioSource = this.audioContext.createBufferSource();
      this.audioSource.buffer = source;
      this.audioSource.playbackRate.value = 1.4;
      this.audioSource.start();
    } else if (type == 'stream') {
      this.audioSource = this.audioContext.createMediaStreamSource(source);
    }

    // audio pipes
    this.compressor = this.audioContext.createDynamicsCompressor();

    this.filter = this.audioContext.createBiquadFilter();
    this.filter.type = 'lowshelf';
    this.filter.frequency.value = 500;

    this.audioGain = this.audioContext.createGain();

    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 32;

    this.audioSource.connect(this.compressor)
    this.compressor.connect(this.filter)
    this.filter.connect(this.audioGain)
    this.audioGain.connect(this.analyser);
    this.analyser.connect(this.audioContext.destination);
  },

  initScene: function() {
    // scene
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.z = 5;
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    $('#loading').hide();
    $('body').append(this.renderer.domElement);

    // cubes
    // TODO: make this not terrible
    cubeXs = [
      -2, -1, 1, 2
    ];
    cubeYs = [
      -1.25, -1.25, -1.25, -1.25,
      -0.25, -0.25, -0.25, -0.25,
       0.55,  0.55,  0.55,  0.55,
       1.25,  1.25,  1.25,  1.25,
    ];
    _(this.analyser.frequencyBinCount).times(function(cubeIndex) {
      geometry = new THREE.BoxGeometry(1, 1, 1);
      material = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true });
      cube = new THREE.Mesh(geometry, material);
      //cube.rotation.y = Math.PI * 45 / 180;
      cube.position.x = cubeXs[cubeIndex % 4];
      cube.position.y = cubeYs[cubeIndex];
      cube.scale.set(0.2, 0.2, 0.2);
      //cube.position.y = 1/(cubeIndex + 1);
      this.scene.add(cube);
      this.cubes[cubeIndex] = cube;
    }.bind(this));
  },

  renderLoop: function() {
    requestAnimationFrame(this.renderLoop.bind(this));

    freqDomain = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(freqDomain);

    this.audioGain.gain.value = freqDomain[8]/256 + 0.65;
    if (this.audioContext.currentTime > 16) {
      this.audioSource.playbackRate.value = 1.1;
    }

    _(this.cubes.length).times(function(cubeIndex) {
      cube = this.cubes[(cubeIndex + 8) % this.cubes.length];
      normalizedFreq = freqDomain[cubeIndex] / 256;
      cube.material.color.r = Math.max(0.7 + normalizedFreq, 1);
      cube.material.color.g = normalizedFreq - 0.5;
      cube.material.color.b = 0.2 + normalizedFreq;
      cube.scale.z = (Math.random() < 0.5 ? 1 : -1) * normalizedFreq;
      cube.scale.y = (Math.random() < 0.5 ? 0.5 : -0.5) * normalizedFreq;
      if (normalizedFreq > 0.75) {
        cube.scale.x = normalizedFreq - 0.6;
        cube.scale.y = normalizedFreq - 0.6;
        if (Math.random() > 0.4) {
          cube.rotation.z += normalizedFreq/16;
          cube.rotation.x += normalizedFreq/8;
        } else {
          cube.scale.x *= normalizedFreq/8;
          cube.rotation.y += normalizedFreq/16;
        }
        cube.rotation.x = normalizedFreq * 2;
      } else {
        cube.scale.z = normalizedFreq;
        cube.rotation.x += normalizedFreq/4;
        cube.rotation.z = normalizedFreq*2;
        cube.rotation.y = -normalizedFreq;
      }
    }.bind(this));

    this.renderer.render(this.scene, this.camera);
  },
};

if (true) {
  url = 'jackson-biggie-i-want-you-back.mp3';
  request = new XMLHttpRequest();
  request.open('GET', url, true);
  request.responseType = 'arraybuffer';
  request.onreadystatechange = function() {
    if (request.readyState === 4 && request.status === 200) {
      data = request.response;
      Wonderland.audioContext.decodeAudioData(data, function(buffer) {
        Wonderland.init('buffer', buffer);
      }, function(error) {
        console.error('Could not decode audio data from', url, '-', error.err);
      });
    }
  }
  request.send();
} else {
  if (!!navigator.getUserMedia) {
    navigator.getUserMedia({
      audio: true,
      //video: true
    }, function(stream) {
      Wonderland.init('stream', stream);
    }, function(error) {
      console.error('Could not retrieve stream from getUserMedia()');
    });
  } else {
    console.error('Browser does not support getUserMedia()');
  }
}
