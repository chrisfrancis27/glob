(function() {
    var context,
        filter,
        soundSource,
        gainNode,
        analyser,

        // Frequency spilts
        lowPass,
        lowShelf,   //lower than value
        peaking,    //between values
        highShelf,  //above value
        volumeLevel = 0.1,
        soundBuffer,
        url = '/loveless.m4a';

    // Step 1 - Initialise the Audio Context
    // There can be only one!
    function init() {

      window.AudioContext = window.AudioContext || window.webkitAudioContext;
      context = new AudioContext();
      filter = context.createBiquadFilter();
    }

    // Step 2: Load our Sound using XHR
    function startSound() {
        // Note: this loads asynchronously
        var request = new XMLHttpRequest();
        request.open("GET", url, true);
        request.responseType = "arraybuffer";

        // Our asynchronous callback
        request.onload = function() {
            var audioData = request.response;

            audioGraph(audioData);


        };

        request.send();
    }

    // Finally: tell the source when to start
    function playSound() {
        // play the source now
        soundSource.noteOn(context.currentTime);
    }

    function stopSound() {
        // stop the source now
        soundSource.noteOff(context.currentTime);
    }

    function adjustVolume(e) {
      //Set the volume
      //gainNode.gain.value += value;
      var value = e.currentTarget.value
      gainNode.gain.value = value;
      console.log("volume level : " + gainNode.gain.value );
    }

    function adjustLowShelfFreq(e) {
      var value = e.currentTarget.value
      lowShelf.gain.value = value;
      console.log("lowShelf level : " + lowShelf.gain.value );
    }
    function adjustPeakinFreq(e) {
      var value = e.currentTarget.value
      peaking.gain.value = value;
      console.log("peaking level : " + peaking.gain.value );
    }
    function adjustHighShelfFreq(e) {
      var value = e.currentTarget.value
      highShelf.gain.value = value;
      console.log("highShelf level : " + highShelf.gain.value );
    }


    // Events
    document.querySelector('.play').addEventListener('click', startSound);
    document.querySelector('.stop').addEventListener('click', stopSound);

    document.querySelector('.volumeControl').addEventListener('change', adjustVolume );
    document.querySelector('.lowShelfControl').addEventListener('change', adjustLowShelfFreq );
    document.querySelector('.peakingControl').addEventListener('change', adjustPeakinFreq );
    document.querySelector('.highShelfControl').addEventListener('change', adjustHighShelfFreq );
    

    function createVolumeNode() {

      // Create a volume (gain) node
      gainNode = context.createGainNode();
      soundSource.connect(gainNode);
      // Connect the gain node to the destination.
      gainNode.connect(context.destination);
      gainNode.gain.value = 0.1;

    }
    function createFilterNode() {
      /*
          "lowPass",      A lowPass filter allows frequencies below the cutoff frequency to pass through and attenuates frequencies above the cutoff. It implements a standard second-order resonant lowPass filter with 12dB/octave rolloff.
          "highPass",     A highPass filter is the opposite of a lowPass filter. Frequencies above the cutoff frequency are passed through, but frequencies below the cutoff are attenuated. It implements a standard second-order resonant highPass filter with 12dB/octave rolloff.
          "bandPass",     A bandPass filter allows a range of frequencies to pass through and attenuates the frequencies below and above this frequency range. It implements a second-order bandPass filter.
          "lowShelf",     The lowShelf filter allows all frequencies through, but adds a boost (or attenuation) to the lower frequencies. It implements a second-order lowShelf filter.
          "highshelf",    The highshelf filter is the opposite of the lowShelf filter and allows all frequencies through, but adds a boost to the higher frequencies. It implements a second-order highshelf filter
          "peaking",      The peaking filter allows all frequencies through, but adds a boost (or attenuation) to a range of frequencies.
          "notch",        The notch filter (also known as a band-stop or band-rejection filter) is the opposite of a bandPass filter. It allows all frequencies through, except for a set of frequencies.
          "allpass"       An allpass filter allows all frequencies through, but changes the phase relationship between the various frequencies. It implements a second-order allpass filter
      */
      lowPass = context.createBiquadFilter();
      // highPass = context.createBiquadFilter();
      // bandPass = context.createBiquadFilter();
      lowShelf = context.createBiquadFilter();
      highShelf = context.createBiquadFilter();
      peaking = context.createBiquadFilter();

      //set the filter types (you could set all to 5, for a different result, feel free to experiment)
      
      lowPass.type = 0;
      // highPass.type = 1;
      // bandPass.type = 2;
      lowShelf.type = 3;
      highShelf.type = 4;
      peaking.type = 5
      //connect 'em in order
      // soundSource.connect(lowShelf);
      // lowShelf.connect(peaking);
      // peaking.connect(highShelf);
      // highShelf.connect(context.destination);


      soundSource.connect(lowShelf);
      lowShelf.connect(peaking);
      peaking.connect(highShelf);
      highShelf.connect(context.destination);


      lowShelf.frequency.value = 220;
      peaking.frequency.value = 400;
      highShelf.frequency.value = 700;

      //lowPass.frequency.value = 1000;

      lowShelf.gain.value = 0;
      peaking.gain.value = 0;
      highShelf.gain.value = 0;

      // peaking.frequency.value = 700;
      // peaking.gain.value = 0;

      // highShelf.frequency.value = 700;
      // highShelf.gain.value = 0;

    }

    function createAnalyser() {
      analyser = (analyser || context.createAnalyser());
      analyser.smoothingTimeConstant = 0.8;
      analyser.fftSize = 512;

      sourceNode = context.createMediaElementSource(audio);
      sourceNode.connect(analyser);
      sourceNode.connect(context.destination);
      
      audio.play();
      drawSpectrum();
    }


    // This is the code we are interested in
    function audioGraph(audioData) {
        // create a sound source
        soundSource = context.createBufferSource();

        // The Audio Context handles creating source buffers from raw binary
        soundBuffer = context.createBuffer(audioData, true/* make mono */);
      
        // Add the buffered data to our object
        soundSource.buffer = soundBuffer;

        // Plug the cable from one thing to the other
        soundSource.connect(context.destination);


        //createVolumeNode();
        //createFilterNode();
        createAnalyser();




        // gainNode = context.createGainNode();
        // lowPass = context.createBiquadFilter();
 
        // // Specify this is a lowpass filter
        // lowPass.type = 0;
         
        // // Quieten sounds over 220Hz
        // lowPass.frequency.value = 100;
         
        // soundSource.connect(gainNode);
        // gainNode.connect(lowPass);
        // lowPass.connect(context.destination);


        // Finally
        playSound(soundSource);
    }


    init();


}());