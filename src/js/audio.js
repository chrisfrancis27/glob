
    $('#audioPlay').removeAttr('disabled').on('click', function(e_click) {
      $(this).attr('disabled','disabled');
      window.AudioContext = window.AudioContext || window.webkitAudioContext;
      var context = new AudioContext()
        , request = new XMLHttpRequest()
        , audioBuffer
        , source
        , analyser
        , sourceJs
      ;

      window.boost = 0;
      request.open('GET', '/daftpunk.ogg', true);
      request.responseType = 'arraybuffer';

      // Decode asynchronously
      request.onload = function() {
        context.decodeAudioData(request.response, function(buffer) {
          sourceJs = context.createJavaScriptNode(2048);
          sourceJs.buffer = buffer;
          sourceJs.connect(context.destination);
          analyser = context.createAnalyser();
          analyser.smoothingTimeConstant = 0.6;
          analyser.fftSize = 512;

          source = context.createBufferSource();
          source.buffer = buffer;
          source.loop = false;

          source.connect(analyser);
          analyser.connect(sourceJs);
          source.connect(context.destination);

          sourceJs.onaudioprocess = function(e) {
            window.freqArray = new Uint8Array(analyser.frequencyBinCount);
            analyser.getByteFrequencyData(window.freqArray);
            window.boost = 0;
            for (var i = 0; i < window.freqArray.length; i++) {
              window.boost += window.freqArray[i];
            }
            window.boost = window.boost / window.freqArray.length;
          };

          source.noteOn(0);
        });
      }
      request.send();
    });

    if(!Detector.webgl){
      Detector.addGetWebGLMessage();
    } else {

      var container = document.getElementById('container');
      var globe = new DAT.Globe(container);
      var i, tweens = [];

      var xhr;
      TWEEN.start();


      xhr = new XMLHttpRequest();
      xhr.open('GET', '/population909500.json', true);
      xhr.onreadystatechange = function(e) {
        if (xhr.readyState === 4) {
          if (xhr.status === 200) {
            var data = JSON.parse(xhr.responseText);
            window.data = data;
            for (var i = 0; i < data.length; i++) {
              globe.addData(data[i][1], {
                  name: data[i][0]
              });
            }
            globe.createPoints();
            globe.animate();
          }
        }
      };
      xhr.send(null);
    }
