var localVideo;
var localStream;
var remoteVideo;
//用于WebRTC连接的类
var peerConnection;
var uuid;
var serverConnection;

//配置ice服务器
var peerConnectionConfig = {
  'iceServers': [
    { 'urls': 'stun:stun.stunprotocol.org:3478' },
    { 'urls': 'stun:stun.l.google.com:19302' },
  ]
};

function pageReady() {
  uuid = createUUID();

  localVideo = document.getElementById('localVideo');
  remoteVideo = document.getElementById('remoteVideo');

  serverConnection = new WebSocket('wss://' + window.location.hostname + ':8443');
  serverConnection.onmessage = gotMessageFromServer;

  var constraints = {
    video: true,
    audio: true,
  };

  if (navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia(constraints).then(getUserMediaSuccess).catch(errorHandler);
    //navigator.mediaDevices.getUserMedia(constraints, getUserMediaSuccess, errorHandler);
  } else {
    alert('Your browser does not support getUserMedia API');
  }
}

//将得到的视频流赋值给全局变量
function getUserMediaSuccess(stream) {
  localStream = stream;
  localVideo.srcObject = stream;
}

//前端界面start按钮绑定的事件，若点击start按钮，则执行start函数，传入参数为true，参数名为isCaller
function start(isCaller) {
  peerConnection = new RTCPeerConnection(peerConnectionConfig);
  //onicecandidate是一个回调函数，用于监听访问者的ice candidate，
  //客户端上传自己的ice candidate，以便stun服务器协助通信
  peerConnection.onicecandidate = gotIceCandidate;
  peerConnection.ontrack = gotRemoteStream;
  peerConnection.addStream(localStream);

  //若isCaller的值为true，则执行createOffer函数，向被叫发送视频连接请求
  if (isCaller) {
    peerConnection.createOffer().then(createdDescription).catch(errorHandler);
  }
}

function gotMessageFromServer(message) {
  //若peerConnection变量还未创建，说明不是主叫，则通过start函数创建一个peerConnection变量来响应可能到来的offer请求
  if (!peerConnection) start(false);

  var signal = JSON.parse(message.data);

  // Ignore messages from ourself
  if (signal.uuid == uuid) return;

  if (signal.sdp) {
    peerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(function () {
      // Only create answers in response to offers
      if (signal.sdp.type == 'offer') {
        //如果收到的消息类型是offer请求，则创建一个响应来建立视频会话
        peerConnection.createAnswer().then(createdDescription).catch(errorHandler);
      }
    }).catch(errorHandler);
  } else if (signal.ice) {
    peerConnection.addIceCandidate(new RTCIceCandidate(signal.ice)).catch(errorHandler);
  }
}

function gotIceCandidate(event) {
  if (event.candidate != null) {
    serverConnection.send(JSON.stringify({ 'ice': event.candidate, 'uuid': uuid }));
  }
}

function createdDescription(description) {
  console.log('got description');

  peerConnection.setLocalDescription(description).then(function () {
    serverConnection.send(JSON.stringify({ 'sdp': peerConnection.localDescription, 'uuid': uuid }));
  }).catch(errorHandler);
}

function gotRemoteStream(event) {
  console.log('got remote stream');
  remoteVideo.srcObject = event.streams[0];
}

function errorHandler(error) {
  console.log(error);
}

// Taken from http://stackoverflow.com/a/105074/515584
// Strictly speaking, it's not a real UUID, but it gets the job done here
function createUUID() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  }

  return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}
