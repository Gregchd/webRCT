import React, { useRef, useState, useEffect } from "react";

// Definir el tipo para socket como WebSocket | null
const VideoCall: React.FC = () => {
    const localVideoRef = useRef<HTMLVideoElement | null>(null);
    const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
    const peerConnection = useRef<RTCPeerConnection | null>(null);
    const socket = useRef<WebSocket | null>(null); // Tipo WebSocket o null
    const [isCalling, setIsCalling] = useState(false);

    // Configuración de WebSocket
    useEffect(() => {
        socket.current = new WebSocket("ws://192.168.1.100:3001"); // Cambia la IP por la de tu servidor

        socket.current.onmessage = (message) => {
            const data = JSON.parse(message.data);
            if (data.type === "offer") {
                handleOffer(data);
            } else if (data.type === "answer") {
                if (peerConnection.current) {
                    peerConnection.current.setRemoteDescription(
                        new RTCSessionDescription(data)
                    );
                }
            } else if (data.type === "candidate") {
                if (peerConnection.current) {
                    peerConnection.current.addIceCandidate(
                        new RTCIceCandidate(data.candidate)
                    );
                }
            }
        };

        // Limpiar WebSocket al desmontar el componente
        return () => {
            if (socket.current) {
                socket.current.close();
            }
        };
    }, []);

    const startCall = async () => {
        setIsCalling(true);
        const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true,
        });
        if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
        }

        peerConnection.current = new RTCPeerConnection();
        stream
            .getTracks()
            .forEach((track) =>
                peerConnection.current?.addTrack(track, stream)
            );

        peerConnection.current.ontrack = (event) => {
            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = event.streams[0];
            }
        };

        peerConnection.current.onicecandidate = (event) => {
            if (event.candidate && socket.current) {
                socket.current.send(
                    JSON.stringify({
                        type: "candidate",
                        candidate: event.candidate,
                    })
                );
            }
        };

        const offer = await peerConnection.current.createOffer();
        await peerConnection.current.setLocalDescription(offer);
        socket.current?.send(JSON.stringify({ type: "offer", sdp: offer.sdp }));
    };

    const handleOffer = async (data: { sdp: string; type: string }) => {
        peerConnection.current = new RTCPeerConnection();
        const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true,
        });
        if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
        }
        stream
            .getTracks()
            .forEach((track) =>
                peerConnection.current?.addTrack(track, stream)
            );

        peerConnection.current.ontrack = (event) => {
            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = event.streams[0];
            }
        };

        peerConnection.current.onicecandidate = (event) => {
            if (event.candidate && socket.current) {
                socket.current.send(
                    JSON.stringify({
                        type: "candidate",
                        candidate: event.candidate,
                    })
                );
            }
        };

        await peerConnection.current.setRemoteDescription(
            new RTCSessionDescription({ type: "offer", sdp: data.sdp })
        );
        const answer = await peerConnection.current.createAnswer();
        await peerConnection.current.setLocalDescription(answer);
        socket.current?.send(
            JSON.stringify({ type: "answer", sdp: answer.sdp })
        );
    };

    return (
        <div className="flex flex-col items-center gap-4 p-4">
            <h2 className="text-xl font-bold">Videollamada WebRTC</h2>
            <div className="flex gap-4">
                <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    className="w-1/2 border"
                />
                <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="w-1/2 border"
                />
            </div>
            {!isCalling && (
                <button
                    onClick={startCall}
                    className="p-2 bg-blue-500 text-white rounded"
                >
                    Iniciar llamada
                </button>
            )}
        </div>
    );
};

export default VideoCall;
