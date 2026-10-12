import os
import time
import wave
import pyaudio
import numpy as np
from typing import Dict, Optional, Callable
from dataclasses import dataclass

@dataclass
class AudioData:
    frames: bytes
    sample_rate: int
    channels: int
    sample_width: int

@dataclass
class VoiceResult:
    text: str
    confidence: float
    language: str
    duration_ms: int

class VoiceProcessor:
    def __init__(self, config: Dict):
        self.config = config
        self.audio_params = {
            'format': pyaudio.paInt16,
            'channels': config.get('channels', 1),
            'rate': config.get('sample_rate', 16000),
            'frames_per_buffer': config.get('chunk_size', 1024)
        }
        self.pyaudio_instance = pyaudio.PyAudio()
        self.stream = None
        self.is_recording = False
        self.wake_word_detected = False
        self.vad_threshold = config.get('vad_threshold', 0.5)
        
    def initialize_microphone(self) -> bool:
        try:
            self.stream = self.pyaudio_instance.open(
                input=True,
                **self.audio_params
            )
            return True
        except Exception as e:
            print(f"Failed to initialize microphone: {e}")
            return False

    def detect_wake_word(self, audio_data: AudioData) -> bool:
        wake_words = [
            self.config.get('default_wake_word', 'robot robot'),
            self.config.get('fallback_wake_word', '小乐小乐')
        ]
        
        detected = False
        for wake_word in wake_words:
            detected = self._simple_wake_word_detection(audio_data, wake_word)
            if detected:
                self.wake_word_detected = True
                break
        
        return detected

    def _simple_wake_word_detection(self, audio_data: AudioData, wake_word: str) -> bool:
        audio_np = np.frombuffer(audio_data.frames, dtype=np.int16)
        energy = np.sum(audio_np ** 2) / len(audio_np)
        
        if energy > 1000:
            return True
        return False

    def start_recording(self, callback: Optional[Callable[[AudioData], None]] = None):
        if not self.stream:
            if not self.initialize_microphone():
                return
        
        self.is_recording = True
        frames = []
        start_time = time.time()
        silence_count = 0
        
        try:
            while self.is_recording:
                data = self.stream.read(self.audio_params['frames_per_buffer'])
                frames.append(data)
                
                audio_np = np.frombuffer(data, dtype=np.int16)
                energy = np.sum(audio_np ** 2) / len(audio_np)
                
                if energy < 500:
                    silence_count += 1
                else:
                    silence_count = 0
                
                if silence_count > 20:
                    break
                
                max_duration = self.config.get('max_duration', 30)
                if (time.time() - start_time) >= max_duration:
                    break
            
            audio_data = AudioData(
                frames=b''.join(frames),
                sample_rate=self.audio_params['rate'],
                channels=self.audio_params['channels'],
                sample_width=self.pyaudio_instance.get_sample_size(self.audio_params['format'])
            )
            
            if callback:
                callback(audio_data)
                
            return audio_data
            
        except Exception as e:
            print(f"Recording error: {e}")
            return None

    def stop_recording(self):
        self.is_recording = False

    def save_audio(self, audio_data: AudioData, filepath: str):
        try:
            with wave.open(filepath, 'wb') as wf:
                wf.setnchannels(audio_data.channels)
                wf.setsampwidth(audio_data.sample_width)
                wf.setframerate(audio_data.sample_rate)
                wf.writeframes(audio_data.frames)
            return True
        except Exception as e:
            print(f"Failed to save audio: {e}")
            return False

    def recognize_speech(self, audio_data: AudioData) -> VoiceResult:
        start_time = time.time()
        
        try:
            result = self._simulate_asr(audio_data)
            duration_ms = int((time.time() - start_time) * 1000)
            return VoiceResult(
                text=result['text'],
                confidence=result['confidence'],
                language=result['language'],
                duration_ms=duration_ms
            )
        except Exception as e:
            print(f"ASR error: {e}")
            duration_ms = int((time.time() - start_time) * 1000)
            return VoiceResult(
                text="",
                confidence=0.0,
                language="en",
                duration_ms=duration_ms
            )

    def _simulate_asr(self, audio_data: AudioData) -> Dict:
        return {
            'text': "Hello robot, tell me a story",
            'confidence': 0.95,
            'language': 'en'
        }

    def synthesize_speech(self, text: str, language: str = "en", output_file: Optional[str] = None) -> Optional[bytes]:
        try:
            sample_rate = 22050
            duration = len(text) * 0.1
            t = np.linspace(0, duration, int(sample_rate * duration))
            
            frequencies = []
            for char in text.lower():
                if char in 'aeiou':
                    frequencies.append(440 + ord(char) * 10)
                else:
                    frequencies.append(220 + ord(char) * 5)
            
            waveform = np.zeros_like(t)
            freq_index = 0
            samples_per_char = len(t) // max(len(text), 1)
            
            for i in range(len(t)):
                if i % samples_per_char == 0 and freq_index < len(frequencies):
                    current_freq = frequencies[freq_index]
                    freq_index += 1
                waveform[i] = np.sin(2 * np.pi * current_freq * t[i]) * 0.3
            
            waveform = (waveform * 32767).astype(np.int16)
            audio_bytes = waveform.tobytes()
            
            if output_file:
                with wave.open(output_file, 'wb') as wf:
                    wf.setnchannels(1)
                    wf.setsampwidth(2)
                    wf.setframerate(sample_rate)
                    wf.writeframes(audio_bytes)
            
            return audio_bytes
            
        except Exception as e:
            print(f"TTS error: {e}")
            return None

    def play_audio(self, audio_bytes: bytes, sample_rate: int = 22050):
        try:
            stream = self.pyaudio_instance.open(
                format=pyaudio.paInt16,
                channels=1,
                rate=sample_rate,
                output=True
            )
            stream.write(audio_bytes)
            stream.stop_stream()
            stream.close()
            return True
        except Exception as e:
            print(f"Audio playback error: {e}")
            return False

    def cleanup(self):
        if self.stream:
            self.stream.stop_stream()
            self.stream.close()
        self.pyaudio_instance.terminate()