'use client';
import React, { useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Send, Loader2, Terminal, Sparkles } from 'lucide-react';

function ShaderScene() {
  const meshRef = useRef<THREE.Mesh>(null!);
  const matRef = useRef<THREE.ShaderMaterial>(null!);
  const { size } = useThree();

  useFrame((state) => {
    if (matRef.current) {
      matRef.current.uniforms.uTime.value = state.clock.elapsedTime;
      matRef.current.uniforms.uResolution.value.set(size.width, size.height);
    }
  });

  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[4, 4]} />
      <shaderMaterial
        ref={matRef}
        uniforms={{
          uTime: { value: 0 },
          uResolution: { value: new THREE.Vector2(1, 1) },
        }}
        vertexShader={`
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          uniform float uTime;
          uniform vec2 uResolution;
          varying vec2 vUv;
          void main() {
            vec2 uv = (vUv - 0.5) * 2.0;
            float wave = sin(uv.x * 10.0 + uTime * 5.0) * 0.5 + 0.5;
            vec3 col = 0.5 + 0.5 * cos(uTime + vec3(0, 1, 2) + wave * 3.0);
            gl_FragColor = vec4(col, 1.0);
          }
        `}
      />
    </mesh>
  );
}

function LoadingDots() {
  return (
    <span className="inline-flex gap-1">
      <span className="loading-dot w-1.5 h-1.5 bg-[var(--text-secondary)] rounded-full" />
      <span className="loading-dot w-1.5 h-1.5 bg-[var(--text-secondary)] rounded-full" />
      <span className="loading-dot w-1.5 h-1.5 bg-[var(--text-secondary)] rounded-full" />
    </span>
  );
}

export default function Home() {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading) return;

    setIsLoading(true);
    setError('');
    setResponse('');

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      setResponse(data.response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get response');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <main className="min-h-screen bg-[var(--bg-primary)] relative">
      <div className="noise-overlay" />
      
      {/* Header */}
      <header className="border-b border-[var(--border-color)] px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 border border-[var(--border-accent)] flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-[var(--text-secondary)]" />
            </div>
            <span className="text-sm font-medium tracking-wider uppercase text-[var(--text-secondary)]">
              glint
            </span>
          </div>
          <div className="flex items-center gap-2 text-[var(--text-muted)] text-xs">
            <span className="w-2 h-2 bg-[var(--text-secondary)] rounded-full" />
            <span>claude connected</span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Left: Shader display */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-[var(--text-muted)] text-xs uppercase tracking-wider">
              <Terminal className="w-3 h-3" />
              <span>shader output</span>
            </div>
            <div className="shader-frame aspect-square w-full max-w-[500px] overflow-hidden">
              <Canvas camera={{ position: [0, 0, 5] }}>
                <color attach="background" args={['#0c0c0c']} />
                <ShaderScene />
              </Canvas>
            </div>
            <div className="text-[var(--text-muted)] text-xs font-mono">
              <span className="text-[var(--text-secondary)]">status:</span> rendering @ 60fps
            </div>
          </div>

          {/* Right: Prompt & Response */}
          <div className="space-y-6">
            {/* Prompt input */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-[var(--text-muted)] text-xs uppercase tracking-wider">
                <span className="cursor-blink">▌</span>
                <span>prompt</span>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="describe what you want..."
                    className="prompt-input w-full h-32 px-4 py-3 text-sm resize-none font-mono"
                    disabled={isLoading}
                  />
                  <div className="absolute bottom-3 right-3 text-[var(--text-muted)] text-xs">
                    shift+enter for newline
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isLoading || !prompt.trim()}
                  className="btn-primary px-6 py-2.5 text-sm flex items-center gap-2 font-mono"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      processing
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      send
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Response area */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-[var(--text-muted)] text-xs uppercase tracking-wider">
                <span>response</span>
              </div>
              <div className="response-container min-h-[200px] max-h-[400px] overflow-y-auto p-4">
                {isLoading && (
                  <div className="flex items-center gap-2 text-[var(--text-secondary)] text-sm">
                    <span>thinking</span>
                    <LoadingDots />
                  </div>
                )}
                {error && (
                  <div className="text-[#ff6b6b] text-sm font-mono">
                    error: {error}
                  </div>
                )}
                {response && !isLoading && (
                  <div className="text-sm text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">
                    {response}
                  </div>
                )}
                {!response && !isLoading && !error && (
                  <div className="text-[var(--text-muted)] text-sm font-mono">
                    awaiting input_
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 border-t border-[var(--border-color)] px-6 py-3 bg-[var(--bg-primary)]">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs text-[var(--text-muted)] font-mono">
          <span>glint v0.1.0</span>
          <span>powered by claude</span>
        </div>
      </footer>
    </main>
  );
}
