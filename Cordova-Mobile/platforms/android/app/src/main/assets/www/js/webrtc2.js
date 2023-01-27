var localVideo;
var localStream;
var remoteVideo;
//用于WebRTC连接的类
var peerConnection;
var uuid;
var socket = io('https://' + window.localStorage.getItem('serverIP') + ':8443');


// //配置ice服务器
var peerConnectionConfig = {
    'iceServers': [
        { 'urls': 'stun:stun.stunprotocol.org:3478' },
        { 'urls': 'stun:stun.l.google.com:19302' },
    ]
};

var app = {
    // Application Constructor
    initialize: function () {
        document.addEventListener('deviceready', this.onDeviceReady.bind(this), false);
    },

    // deviceready Event Handler
    //
    // Bind any cordova events here. Common events are:
    // 'pause', 'resume', etc.
    onDeviceReady: async function () {
        // this.receivedEvent('deviceready');
        uuid = createUUID();
        console.log('this is uuid:', uuid);
        localVideo = document.getElementById('localVideo');
        remoteVideo = document.getElementById('remoteVideo');

        socket.on('message', (message) => {
            if (!peerConnection) START1(false);
            var signal = JSON.parse(message);
            // Ignore messages from ourself
            if (signal.uuid == uuid) return;
            console.log(`this is signal.uuid:${signal.uuid}`);
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
        })
        var permissions = cordova.plugins.permissions;
        var tmp_list = [
            permissions.CAMERA,
            // permissions.MICROPHONE,
            permissions.RECORD_AUDIO,
            permissions.MODIFY_AUDIO_SETTINGS
        ]
        // var permissions_acquired=true
        var permissions_acquired = 0;
        for (let i in tmp_list) {
            await permissions.hasPermission(tmp_list[i], function (status) {
                if (status.hasPermission) {
                    // here you can savely start your own plugin because you already have CAMERA permission
                    // start();
                    // onTestsPassed()
                    console.log('already have permission')
                    permissions_acquired+=1
                    if(permissions_acquired===2) onTestsPassed()
                }
                else {
                    // need to request camera permission
                    permissions.requestPermission(tmp_list[i], success, error);
                    function error() {
                        // camera permission not turned on        
                        // appendElement('p', 'Please accept the Android permissions.', codes.error);
                        console.log('camera permission not turned on')
                        permissions_acquired=0
                    }

                    function success(status) {
                        if (status.hasPermission) {
                            // user accepted, here you can start your own plugin
                            // onTestsPassed()
                            console.log('request success')
                            permissions_acquired+=1
                            if(permissions_acquired===2) onTestsPassed()
                        }
                    }
                }
            });
        }
        // console.log(permissions_acquired)
        // if (permissions_acquired === 3) onTestsPassed()
    },
};



//前端界面start按钮绑定的事件，若点击start按钮，则执行start函数，传入参数为true，参数名为isCaller
function START1(isCaller) {
    peerConnection = new RTCPeerConnection(peerConnectionConfig);
    //onicecandidate是一个回调函数，用于监听访问者的ice candidate，
    //客户端上传自己的ice candidate，以便stun服务器协助通信
    peerConnection.onicecandidate = gotIceCandidate;
    peerConnection.ontrack = gotRemoteStream;
    peerConnection.addStream(localStream);

    //若isCaller的值为true，则执行createOffer函数，向被叫发送视频连接请求
    if (isCaller) {
        console.log("you clicked start video button!")
        peerConnection.createOffer().then(createdDescription).catch(errorHandler);
    }
}

function gotMessageFromServer(message) {
    //若peerConnection变量还未创建，说明不是主叫，则通过start函数创建一个peerConnection变量来响应可能到来的offer请求
    if (!peerConnection) START1(false);

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
        socket.emit('message', JSON.stringify({ 'ice': event.candidate, 'uuid': uuid, 'rooms': room }));
    }
}

function createdDescription(description) {
    peerConnection.setLocalDescription(description).then(function () {
        socket.emit('message', JSON.stringify({ 'sdp': peerConnection.localDescription, 'uuid': uuid, 'rooms': room }));
    });
}

function gotRemoteStream(event) {
    console.log('got remote stream');
    remoteVideo.srcObject = event.streams[0];
}


// // Taken from http://stackoverflow.com/a/105074/515584
// // Strictly speaking, it's not a real UUID, but it gets the job done here
function createUUID() {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    }
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}



async function captureAndInjectCameraFeed(callback) {
    var constraints = {
        video: true,
        audio: { echoCancellation: true }
    };
    function handleSuccess(stream) {
        localStream = stream
        window.stream = stream; // make stream available to browser console
        localVideo.srcObject = stream;
        // document.body.appendChild(video);
        console.log(stream)
        callback(false);
    }

    function handleError(error) {
        console.log('navigator.getUserMedia error: ', error);
        callback(true, error);
    }
    // navigator.mediaDevices.getUserMedia(constraints).
    //     then(handleSuccess).catch(handleError);
    var stream = await navigator.mediaDevices.getUserMedia(constraints)
    try {
        handleSuccess(stream)
    } catch (err) {
        handleError(err)
    }

};



function onTestsPassed(e) {
    captureAndInjectCameraFeed(function (error, message) {
        if (!error) {
            console.log('Camera: Success, was found and injected into the webpage');
        } else {
            console.log('Camera: Failed, an error occured and did not inject camera feed into the webpage.');
            // appendElement('p', 'Error: ' + JSON.stringify(message), codes.error);
            console.log('This error may appear if you have not clicked a permissions pop up (browser dependant), manually blocked the camera, or if the experience is being served from an unsecured host. If the HTTPS test failed please click "Force redirect to HTTPS" and try again.This is error info:', message);
        }
    });
};

function goToHTTPS() {
    location.href = 'https:' + window.location.href.substring(window.location.protocol.length);
}
function errorHandler(err) {
    console.log('this is error handler:', err);
}
app.initialize();