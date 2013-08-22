/**
 * dat.globe Javascript WebGL Globe Toolkit
 * http://dataarts.github.com/dat.globe
 *
 * Copyright 2011 Data Arts Team, Google Creative Lab
 *
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 */

var DAT = DAT || {};

DAT.Globe = function(container, colorFn) {

  colorFn = colorFn || function(x) {
    var c = new THREE.Color();
    c.setHSV(Math.random(), 1.0,0.5);
    //c.setHSV( ( 0.6 - ( x * 0.5 ) ), 1.0, 1.0 );
    return c;
  };

  // RGBA color of world glow outline
  var glowRGBA = '0.9, 0.4, 1.0, 1.0';
  // Which image to use for map texture
  var globeTexture = 'world.jpg';

  // Shaders (crazy-ass complex GPU math calculations etc)
  //  - Earth
  //    - Vertex shader is pretty much the default minumum
  //    - Frag shader adds the texture image and lighting effects
  //  - Spikeys
  //    - Vertex shader adjusts vertex positions based on average track volume
  //    - Frag shader sets color green, intensity fades as it gets further away
  //  - Atmosphere
  //    - Vertex shader pretty standard like the 'earth' one
  //    - Frag shader draws a pink fuzzy outline around the globe
  var Shaders = {
    'earth' : {
      uniforms: {
        'texture': { type: 't', value: 0, texture: null }
      },
      vertexShader: [
        'varying vec3 vNormal;',
        'varying vec2 vUv;',
        'void main() {',
          'gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
          'vNormal = normalize( normalMatrix * normal );',
          'vUv = uv;',
        '}'
      ].join('\n'),
      fragmentShader: [
        'uniform sampler2D texture;',
        'varying vec3 vNormal;',
        'varying vec2 vUv;',
        'void main() {',
          'vec3 diffuse = texture2D( texture, vUv ).xyz;',
          'float intensity = 1.25 - dot( vNormal, vec3( 0.0, 0.0, 1.0 ) );',
          'vec3 atmosphere = vec3( 1.0, 1.0, 1.0 ) * pow( intensity, 3.0 );',
          'gl_FragColor = vec4( diffuse + atmosphere, 1 );',
        '}'
      ].join('\n')
    },
    'spikeys' : {
      uniforms: {
        'frequency': { type: 'f', value: 1 },
        'volume': { type: 'f', value: 1 }
      },
      vertexShader: [
        'varying vec3 vNormal;',
        'varying vec2 vUv;',
        'varying vec4 vPos;',
        'uniform float frequency;',
        'uniform float volume;',
        'void main() {',
          'vec3 newPosition = vec3(position * (1.0 + volume / 1000.0));',
          'gl_Position = projectionMatrix * modelViewMatrix * vec4( newPosition, 1.0 );',
          'vNormal = normalize( normalMatrix * normal );',
          'vUv = uv;',
          'vPos = gl_Position;',
        '}'
      ].join('\n'),
      fragmentShader: [
        'varying vec3 vNormal;',
        'varying vec2 vUv;',
        'varying vec4 vPos;',
        'void main() {',
          'float intensity = 2.0 - vPos.z * 0.0013;',
          'gl_FragColor = vec4(0.1, 1.0, 0.1, 1.0) * intensity;',
        '}'
      ].join('\n')
    },
    'atmosphere' : {
      uniforms: {},
      vertexShader: [
        'varying vec3 vNormal;',
        'void main() {',
          'vNormal = normalize( normalMatrix * normal );',
          'gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 0.9 );',
        '}'
      ].join('\n'),
      fragmentShader: [
        'varying vec3 vNormal;',
        'void main() {',
          'float intensity = pow( 0.8 - dot( vNormal, vec3( 0.0, 0, 0.5 ) ), 12.0 );',
          'gl_FragColor = vec4( ' + glowRGBA + ' ) * intensity;',
        '}'
      ].join('\n')
    }
  };

  // A metric fuck-tonne of variables
  var camera, scene, sceneAtmosphere, sceneSpikeys, renderer, w, h;
  var vector, mesh, atmosphere, origin, originMesh;

  var earthUniforms, spikeyUniforms, atmosphereUniforms;

  var overRenderer;

  var imgDir = '/';

  var curZoomSpeed = 0;
  var zoomSpeed = 50;

  var mouse = { x: 0, y: 0 }, mouseOnDown = { x: 0, y: 0 };
  var rotation = { x: 0, y: 0 },
      target = { x: Math.PI*3/2, y: Math.PI / 6.0 },
      targetOnDown = { x: 0, y: 0 };

  var distance = 100000, distanceTarget = 100000;
  var padding = 40;
  var PI_HALF = Math.PI / 2;

  function init() {
    var shader
      , material
      , geometry
    ;

    // Set stage defaults
    container.style.color = '#fff';
    container.style.font = '13px/20px Arial, sans-serif';
    w = container.offsetWidth || window.innerWidth;
    h = container.offsetHeight || window.innerHeight;


    /********* CAMERA *********/
    // Set up camera
    camera = new THREE.Camera(
        30, w / h, 1, 10000);
    camera.position.z = distance;
    // Set camera vector
    vector = new THREE.Vector3();



    /********* SCENES *********/
    // Create Earth scene
    scene = new THREE.Scene();
    // Create Atmospere scene
    sceneAtmosphere = new THREE.Scene();
    // Create spikeys scene
    sceneSpikeys = new THREE.Scene();



    /********* EARTH *********/
    // Create Earth shape
    geometry = new THREE.Sphere(200, 40, 30);
    // Create earthUniforms from Earth shader
    shader = Shaders['earth'];
    earthUniforms = THREE.UniformsUtils.clone(shader.uniforms);
    // Add Earth texture from image file
    earthUniforms['texture'].texture = THREE.ImageUtils.loadTexture(imgDir+globeTexture);
    // Create Earth material using Earth shader
    material = new THREE.MeshShaderMaterial({
      uniforms: earthUniforms,
      vertexShader: shader.vertexShader,
      fragmentShader: shader.fragmentShader
    });
    // Create Earth mesh
    mesh = new THREE.Mesh(geometry, material);
    mesh.matrixAutoUpdate = false;
    // Add Earth to the scene
    scene.addObject(mesh);
    

    /********* ATMOSPHERE *********/
    // Create uniforms from Atmosphere shader
    shader = Shaders['atmosphere'];
    atmosphereUniforms = THREE.UniformsUtils.clone(shader.uniforms);
    // Create Atmosphere material using Atmosphere shader
    material = new THREE.MeshShaderMaterial({
      uniforms: atmosphereUniforms,
      vertexShader: shader.vertexShader,
      fragmentShader: shader.fragmentShader
    });
    // Create Atmosphere mesh
    mesh = new THREE.Mesh(geometry, material);
    mesh.scale.x = mesh.scale.y = mesh.scale.z = 1.1;
    mesh.flipSided = true;
    mesh.matrixAutoUpdate = false;
    mesh.updateMatrix();
    // Add Atmosphere to its own scene
    sceneAtmosphere.addObject(mesh);



    /********* RENDERER *********/
    renderer = new THREE.WebGLRenderer({antialias: true});
    renderer.autoClear = false;
    renderer.setClearColorHex(0x000000, 0.0);
    renderer.setSize(w, h);
    renderer.domElement.style.position = 'absolute';
    container.appendChild(renderer.domElement);



    /********* EVENT LISTENERS *********/
    container.addEventListener('mousedown', onMouseDown, false);
    container.addEventListener('mousewheel', onMouseWheel, false);
    document.addEventListener('keydown', onDocumentKeyDown, false);
    window.addEventListener('resize', onWindowResize, false);
    container.addEventListener('mouseover', function() {
      overRenderer = true;
    }, false);
    container.addEventListener('mouseout', function() {
      overRenderer = false;
    }, false);
  }

  // Generate spikeys from JSON data
  addData = function(data, opts) {
    var lat, lng, size, color, i
      , step = 3
      , colorFnWrapper = function(data, i) { return colorFn(); }
    ;

    // Create new blank geometry object
    var subgeo = new THREE.Geometry();
    // Parse data and pass it to addPoint()
    for (i = 0; i < data.length; i += step) {
      lat = data[i];
      lng = data[i + 1];
      color = colorFnWrapper(data,i);
      size = data[i + 2];
      size = size*200;
      addPoint(lat, lng, size, color, subgeo);
    }

    // Set base geometry to object created above
    this._baseGeometry = subgeo;
  };

  // Add all the points together as one mesh
  function createPoints() {
    if (this._baseGeometry !== undefined) {
      // Create spikeyUniforms from Spikeys shader
      var shader = Shaders['spikeys'];
      spikeyUniforms = THREE.UniformsUtils.clone(shader.uniforms);

      var attrs = {
        'origin': { type: 'vec3', value: [] },
      };
      origin = new THREE.Geometry();
      originMesh = new THREE.Mesh(origin);
      sceneSpikeys.addObject(originMesh);

      // Create mesh from all the spikes
      this.points = new THREE.Mesh(this._baseGeometry, new THREE.MeshShaderMaterial({
        uniforms: spikeyUniforms,
        attributes: attrs,
        vertexShader: shader.vertexShader,
        fragmentShader: shader.fragmentShader
      }));


      for (var i = 0; i < this._baseGeometry.vertices.length; i++) {
        attrs.origin.value.push(origin.xyz);
      }

      sceneSpikeys.addObject(this.points);
    }
  }

  // Add an individual point to the 3d "subgeo" mesh
  function addPoint(lat, lng, size, color, subgeo) {
    // Fancy maths
    var phi = (90 - lat) * Math.PI / 180;
    var theta = (180 - lng) * Math.PI / 180;

    // Create Spike geometry
    var geometry = new THREE.Cube(0.75, 0.75, 1, 1, 1, 1, null, false, { px: true,
          nx: true, py: true, ny: true, pz: false, nz: true});
    for (var i = 0; i < geometry.vertices.length; i++) {
      var vertex = geometry.vertices[i];
      vertex.position.z += 0.5;
    }

    // Create spike mesh
    var spikey = new THREE.Mesh(geometry);

    // Set position
    spikey.position.x = Math.sin(phi) * Math.cos(theta);
    spikey.position.y = Math.cos(phi);
    spikey.position.z = Math.sin(phi) * Math.sin(theta);

    // Orient it towards centre of Earth
    spikey.lookAt(mesh.position);

    // Scale it according to data (negative because it's pointing TOWARDS the center)
    spikey.scale.z = -200 -size;

    // Signal THREE.js to redraw
    spikey.updateMatrix();

    var i;
    for (i = 0; i < spikey.geometry.faces.length; i++) {
      spikey.geometry.faces[i].color = color;
    }

    // Merge into geometry object passed in earlier
    GeometryUtils.merge(subgeo, spikey);
  }

  function onMouseDown(event) {
    event.preventDefault();

    container.addEventListener('mousemove', onMouseMove, false);
    container.addEventListener('mouseup', onMouseUp, false);
    container.addEventListener('mouseout', onMouseOut, false);

    mouseOnDown.x = - event.clientX;
    mouseOnDown.y = event.clientY;

    targetOnDown.x = target.x;
    targetOnDown.y = target.y;

    container.style.cursor = 'move';
  }

  function onMouseMove(event) {
    mouse.x = - event.clientX;
    mouse.y = event.clientY;

    var zoomDamp = distance/1000;

    target.x = targetOnDown.x + (mouse.x - mouseOnDown.x) * 0.005 * zoomDamp;
    target.y = targetOnDown.y + (mouse.y - mouseOnDown.y) * 0.005 * zoomDamp;

    target.y = target.y > PI_HALF ? PI_HALF : target.y;
    target.y = target.y < - PI_HALF ? - PI_HALF : target.y;
  }

  function onMouseUp(event) {
    container.removeEventListener('mousemove', onMouseMove, false);
    container.removeEventListener('mouseup', onMouseUp, false);
    container.removeEventListener('mouseout', onMouseOut, false);
    container.style.cursor = 'auto';
  }

  function onMouseOut(event) {
    container.removeEventListener('mousemove', onMouseMove, false);
    container.removeEventListener('mouseup', onMouseUp, false);
    container.removeEventListener('mouseout', onMouseOut, false);
  }

  function onMouseWheel(event) {
    event.preventDefault();
    if (overRenderer) {
      zoom(event.wheelDeltaY * 0.3);
    }
    return false;
  }

  function onDocumentKeyDown(event) {
    switch (event.keyCode) {
      case 38:
        zoom(100);
        event.preventDefault();
        break;
      case 40:
        zoom(-100);
        event.preventDefault();
        break;
    }
  }

  function onWindowResize( event ) {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
  }

  function zoom(delta) {
    distanceTarget -= delta;
    distanceTarget = distanceTarget > 1000 ? 1000 : distanceTarget;
    distanceTarget = distanceTarget < 350 ? 350 : distanceTarget;
  }

  function animate() {
    
    // Loop through audio frequencies array
    if(typeof window.freqArray === 'object' && window.freqArray.length > 0) {
      for (var i = 0; i < window.freqArray.length; i++) {
        var freq = 256 - i
          , vol = window.freqArray[i]
        ;

        // Send the frequency and volume variables to the shader pipeline
        spikeyUniforms.frequency.value = freq;
        //spikeyUniforms.volume.value = vol * window.averageTrackVolume;
        spikeyUniforms.volume.value = window.averageTrackVolume;
      }
    }

    requestAnimationFrame(animate);
    render();
  }

  function render() {
    zoom(curZoomSpeed);

    rotation.x += (target.x - rotation.x) * 0.1;
    rotation.y += (target.y - rotation.y) * 0.1;
    distance += (distanceTarget - distance) * 0.3;

    camera.position.x = distance * Math.sin(rotation.x) * Math.cos(rotation.y);
    camera.position.y = distance * Math.sin(rotation.y);
    camera.position.z = distance * Math.cos(rotation.x) * Math.cos(rotation.y);

    vector.copy(camera.position);


    renderer.clear();
    renderer.render(sceneSpikeys, camera);
    renderer.render(scene, camera);
    renderer.render(sceneAtmosphere, camera);

  }

  init();

  this.animate = animate;
  this.addData = addData;
  this.createPoints = createPoints;
  this.renderer = renderer;
  this.scene = scene;

  return this;

};

