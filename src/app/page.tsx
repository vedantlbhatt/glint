'use client';
import React, { useRef, useState, useCallback, useEffect, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF, Environment, Center } from '@react-three/drei';
import * as THREE from 'three';
import { Send, Loader2, Sparkles, Eye, Code, User, Box, Zap, Upload } from 'lucide-react';

const DEFAULT_FRAGMENT_SHADER = `
  uniform float uTime;
  uniform vec2 uResolution;
  varying vec2 vUv;
  void main() {
    vec2 uv = (vUv - 0.5) * 2.0;
    float wave = sin(uv.x * 10.0 + uTime * 5.0) * 0.5 + 0.5;
    vec3 col = 0.5 + 0.5 * cos(uTime + vec3(0, 1, 2) + wave * 3.0);
    gl_FragColor = vec4(col, 1.0);
  }
`;

const VERTEX_SHADER = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  shaderCode?: string;
}

function ShaderScene({ fragmentShader }: { fragmentShader: string }) {
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
        key={fragmentShader}
        ref={matRef}
        uniforms={{
          uTime: { value: 0 },
          uResolution: { value: new THREE.Vector2(1, 1) },
        }}
        vertexShader={VERTEX_SHADER}
        fragmentShader={fragmentShader}
      />
    </mesh>
  );
}

function Model({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  const groupRef = useRef<THREE.Group>(null!);
  const bonesMap = useRef<{ [key: string]: THREE.Bone }>({});
  
  // Find bones on mount
  useEffect(() => {
    const bones: { [key: string]: THREE.Bone } = {};
    
    scene.traverse((child) => {
      if ((child as THREE.Bone).isBone) {
        bones[child.name] = child as THREE.Bone;
      }
    });
    
    bonesMap.current = bones;
    console.log('Bones ready:', Object.keys(bones).join(', '));
  }, [scene]);
  
  useFrame((state) => {
    const time = state.clock.elapsedTime;
    const bones = bonesMap.current;
    const walkSpeed = 3;
    const legSwing = 0.3;
    const armSwing = 0.3;
    
    // Rotate whole model slowly
    if (groupRef.current) {
      groupRef.current.rotation.y = time * 0.3;
    }
    
    // Walk animation - X axis, negated for correct direction
    // Left leg swings forward/back
    if (bones['L_Thigh']) {
      bones['L_Thigh'].rotation.x = Math.sin(time * walkSpeed) * legSwing + 3;
      console.log('L_Thigh rotation:', bones['L_Thigh'].rotation.x);
    }
    if (bones['L_Calf']) {
      bones['L_Calf'].rotation.x = Math.max(0, -Math.sin(time * walkSpeed)) * legSwing * 0.5;
    }
    
    // Right leg (opposite phase)
    if (bones['R_Thigh']) {
      bones['R_Thigh'].rotation.x = Math.sin(time * walkSpeed + Math.PI) * legSwing + 3.5;
    }
    if (bones['R_Calf']) {
      bones['R_Calf'].rotation.x = Math.max(0, -Math.sin(time * walkSpeed + Math.PI)) * legSwing * 0.5;
    }
    
    // Arms swing opposite to legs
    if (bones['L_Upperarm']) {
      bones['L_Upperarm'].rotation.y = Math.sin(time * walkSpeed + 2 * Math.PI) * armSwing;
    }
    if (bones['R_Upperarm']) {
      bones['R_Upperarm'].rotation.y = Math.sin(time * walkSpeed) * armSwing;
    }
  });

  return (
    <group ref={groupRef}>
      <primitive object={scene} scale={1} position={[0, -1, 0]} />
    </group>
  );
}

function ModelScene({ modelUrl }: { modelUrl: string }) {
  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight position={[5, 10, 5]} intensity={1.5} />
      <directionalLight position={[-5, 5, -5]} intensity={0.5} />
      <Suspense fallback={null}>
        <Model url={modelUrl} />
        <Environment preset="studio" />
      </Suspense>
      <OrbitControls 
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        target={[0, 0, 0]}
      />
      {/* Ground plane for reference */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]}>
        <planeGeometry args={[10, 10]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
    </>
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

function ModeToggle({ mode, setMode }: { mode: 'shader' | 'model'; setMode: (m: 'shader' | 'model') => void }) {
  return (
    <div className="inline-flex bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg p-0.5">
      <button
        onClick={() => setMode('shader')}
        className={`flex items-center justify-center w-8 h-7 rounded-md transition-all ${
          mode === 'shader'
            ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]'
            : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
        }`}
        title="Shader mode"
      >
        <Zap className="w-4 h-4" />
      </button>
      <button
        onClick={() => setMode('model')}
        className={`flex items-center justify-center w-8 h-7 rounded-md transition-all ${
          mode === 'model'
            ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]'
            : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
        }`}
        title="3D Model mode"
      >
        <Box className="w-4 h-4" />
      </button>
    </div>
  );
}

function ViewToggle({ view, setView }: { view: 'visual' | 'code'; setView: (v: 'visual' | 'code') => void }) {
  return (
    <div className="inline-flex bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg p-0.5">
      <button
        onClick={() => setView('visual')}
        className={`flex items-center justify-center w-8 h-7 rounded-md transition-all ${
          view === 'visual'
            ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]'
            : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
        }`}
        title="Visual output"
      >
        <Eye className="w-4 h-4" />
      </button>
      <button
        onClick={() => setView('code')}
        className={`flex items-center justify-center w-8 h-7 rounded-md transition-all ${
          view === 'code'
            ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]'
            : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
        }`}
        title="View code"
      >
        <Code className="w-4 h-4" />
      </button>
    </div>
  );
}

function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 ${
        isUser 
          ? 'bg-[var(--bg-tertiary)] border border-[var(--border-color)]' 
          : 'bg-[var(--text-secondary)]'
      }`}>
        {isUser ? (
          <User className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
        ) : (
          <Sparkles className="w-3.5 h-3.5 text-[var(--bg-primary)]" />
        )}
      </div>
      <div className={`flex-1 ${isUser ? 'text-right' : ''}`}>
        <div className={`inline-block max-w-[85%] px-3 py-2 rounded-lg text-sm ${
          isUser 
            ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]' 
            : 'bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border-color)]'
        }`}>
          <p className="whitespace-pre-wrap">{message.content}</p>
          {message.shaderCode && (
            <div className="mt-2 pt-2 border-t border-[var(--border-color)]">
              <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">
                shader generated ✓
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [shaderCode, setShaderCode] = useState(DEFAULT_FRAGMENT_SHADER);
  const [displayedShader, setDisplayedShader] = useState(DEFAULT_FRAGMENT_SHADER);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [splitPosition, setSplitPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [view, setView] = useState<'visual' | 'code'>('visual');
  const [mode, setMode] = useState<'shader' | 'model'>('model');
  const [modelUrl, setModelUrl] = useState<string | null>('/robot.glb');
  const [modelName, setModelName] = useState<string>('robot.glb');
  const containerRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleMouseDown = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = (x / rect.width) * 100;
    
    setSplitPosition(Math.min(80, Math.max(20, percentage)));
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const extractShaderCode = (response: string): string | null => {
    const codeBlockRegex = /```(?:glsl|frag|fragment)?\s*([\s\S]*?)```/i;
    const match = response.match(codeBlockRegex);
    
    if (match) {
      return match[1].trim();
    }
    
    if (response.includes('void main()') && response.includes('gl_FragColor')) {
      return response.trim();
    }
    
    return null;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.name.endsWith('.glb') && !file.name.endsWith('.gltf')) {
      setError('Please upload a .glb or .gltf file');
      return;
    }
    
    const url = URL.createObjectURL(file);
    setModelUrl(url);
    setModelName(file.name);
    setMode('model');
    setView('visual');
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: prompt,
    };
    
    setMessages(prev => [...prev, userMessage]);
    setPrompt('');
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: `Generate a GLSL fragment shader based on this description: "${prompt}"

Requirements:
- Use these exact uniforms: uniform float uTime; uniform vec2 uResolution; varying vec2 vUv;
- The shader should be animated using uTime
- Output to gl_FragColor
- Return ONLY the fragment shader code in a code block, no explanations
- Make it visually interesting and creative` 
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      const extractedCode = extractShaderCode(data.response);
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: extractedCode ? 'Here\'s your shader — check the output panel!' : 'I couldn\'t generate a valid shader. Try a different description.',
        shaderCode: extractedCode || undefined,
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      
      if (extractedCode) {
        setShaderCode(extractedCode);
        setDisplayedShader(extractedCode);
        setMode('shader');
        setView('visual');
      }
    } catch (err) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Error: ${err instanceof Error ? err.message : 'Failed to get response'}`,
      };
      setMessages(prev => [...prev, errorMessage]);
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

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 150) + 'px';
    }
  };

  return (
    <main 
      className="h-screen bg-[var(--bg-primary)] flex flex-col overflow-hidden select-none"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="noise-overlay" />
      
      {/* Header */}
      <header className="border-b border-[var(--border-color)] px-4 py-2 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 border border-[var(--border-accent)] flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-[var(--text-secondary)]" />
            </div>
            <span className="text-xs font-medium tracking-wider uppercase text-[var(--text-secondary)]">
              glint
            </span>
          </div>
          <div className="flex items-center gap-2 text-[var(--text-muted)] text-xs">
            <span className="w-1.5 h-1.5 bg-[var(--text-secondary)] rounded-full" />
            <span>claude connected</span>
          </div>
        </div>
      </header>

      {/* Main split view */}
      <div 
        ref={containerRef}
        className="flex-1 flex relative min-h-0"
        style={{ cursor: isDragging ? 'col-resize' : 'default' }}
      >
        {/* Left: Chat */}
        <div 
          className="h-full overflow-hidden flex flex-col border-r border-[var(--border-color)]"
          style={{ width: `${splitPosition}%` }}
        >
          {/* Chat messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center px-4">
                <div className="w-12 h-12 border border-[var(--border-accent)] rounded-lg flex items-center justify-center mb-4">
                  <Sparkles className="w-6 h-6 text-[var(--text-muted)]" />
                </div>
                <p className="text-[var(--text-secondary)] text-sm mb-1">describe a shader</p>
                <p className="text-[var(--text-muted)] text-xs">
                  try "a swirling galaxy" or "ocean waves"
                </p>
              </div>
            )}
            
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            
            {isLoading && (
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-md bg-[var(--text-secondary)] flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-3.5 h-3.5 text-[var(--bg-primary)]" />
                </div>
                <div className="flex-1">
                  <div className="inline-block px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)]">
                    <div className="flex items-center gap-2 text-[var(--text-secondary)] text-sm">
                      <span>generating shader</span>
                      <LoadingDots />
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={chatEndRef} />
          </div>
          
          {/* Input area */}
          <div className="flex-shrink-0 p-3 border-t border-[var(--border-color)]">
            <form onSubmit={handleSubmit} className="relative">
              <div className="relative bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg focus-within:border-[var(--border-accent)] transition-colors">
                <textarea
                  ref={textareaRef}
                  value={prompt}
                  onChange={handleTextareaChange}
                  onKeyDown={handleKeyDown}
                  placeholder="describe your shader..."
                  rows={1}
                  className="w-full bg-transparent px-4 py-3 pr-12 text-sm resize-none font-mono text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none max-h-[150px]"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={isLoading || !prompt.trim()}
                  className="absolute right-2 bottom-2 w-8 h-8 flex items-center justify-center rounded-md bg-[var(--text-primary)] text-[var(--bg-primary)] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--accent)] transition-colors"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>
              <div className="flex items-center justify-between mt-2 px-1">
                <span className="text-[10px] text-[var(--text-muted)]">
                  enter to send · shift+enter for newline
                </span>
              </div>
            </form>
          </div>
        </div>

        {/* Draggable divider */}
        <div
          className="absolute top-0 bottom-0 w-2 -ml-1 cursor-col-resize z-10 group"
          style={{ left: `${splitPosition}%` }}
          onMouseDown={handleMouseDown}
        >
          <div className={`absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[2px] transition-colors ${
            isDragging 
              ? 'bg-[var(--text-secondary)]' 
              : 'bg-transparent group-hover:bg-[var(--border-accent)]'
          }`} />
        </div>

        {/* Right: Output */}
        <div 
          className="h-full overflow-hidden flex flex-col"
          style={{ width: `${100 - splitPosition}%` }}
        >
          <div className="flex-1 flex flex-col p-3 min-h-0">
            {/* Header row */}
            <div className="flex items-center justify-between mb-2 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-[var(--text-muted)] text-xs uppercase tracking-wider">
                  <span>output</span>
                </div>
                <ModeToggle mode={mode} setMode={setMode} />
              </div>
              <div className="flex items-center gap-2">
                {mode === 'model' && (
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".glb,.gltf"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-accent)] transition-colors"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      upload .glb
                    </button>
                  </>
                )}
                {mode === 'shader' && <ViewToggle view={view} setView={setView} />}
              </div>
            </div>
            
            {/* Main content area */}
            <div className="shader-frame flex-1 overflow-hidden relative min-h-0">
              {mode === 'shader' ? (
                view === 'visual' ? (
                  <Canvas camera={{ position: [0, 0, 5] }} className="!absolute inset-0">
                    <color attach="background" args={['#0c0c0c']} />
                    <ShaderScene fragmentShader={displayedShader} />
                  </Canvas>
                ) : (
                  <div className="absolute inset-0 overflow-auto bg-[var(--bg-secondary)] p-3">
                    <pre className="text-xs font-mono text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">
                      <code>{shaderCode}</code>
                    </pre>
                  </div>
                )
              ) : (
                modelUrl ? (
                  <Canvas camera={{ position: [0, 0, 5], fov: 50 }} className="!absolute inset-0">
                    <color attach="background" args={['#0c0c0c']} />
                    <ModelScene modelUrl={modelUrl} />
        </Canvas>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <div 
                      className="w-24 h-24 border-2 border-dashed border-[var(--border-color)] rounded-lg flex flex-col items-center justify-center mb-4 cursor-pointer hover:border-[var(--border-accent)] transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Box className="w-8 h-8 text-[var(--text-muted)] mb-2" />
                      <Upload className="w-4 h-4 text-[var(--text-muted)]" />
                    </div>
                    <p className="text-[var(--text-secondary)] text-sm mb-1">drop a .glb file</p>
                    <p className="text-[var(--text-muted)] text-xs">or click to browse</p>
                  </div>
                )
              )}
            </div>
            
            {/* Bottom bar */}
            <div className="text-[var(--text-muted)] text-[10px] font-mono mt-2 flex-shrink-0 flex items-center justify-between">
              <span>
                <span className="text-[var(--text-secondary)]">status:</span>{' '}
                {mode === 'shader' 
                  ? (view === 'visual' ? 'rendering @ 60fps' : 'viewing source')
                  : (modelUrl ? `loaded: ${modelName}` : 'no model loaded')
                }
              </span>
              {mode === 'shader' && view === 'code' && (
                <span>{shaderCode.split('\n').length} lines</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-[var(--border-color)] px-4 py-1.5 flex-shrink-0">
        <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] font-mono">
          <span>glint v0.1.0</span>
          <span>powered by claude</span>
        </div>
      </footer>
    </main>
  );
}
