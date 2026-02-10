import { useState, useEffect, useMemo } from 'react';
import './Dice.css';

// Dot positions for each face value (percentage-based)
const dotPositions = {
    1: [[50, 50]],
    2: [[28, 28], [72, 72]],
    3: [[28, 28], [50, 50], [72, 72]],
    4: [[28, 28], [72, 28], [28, 72], [72, 72]],
    5: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]],
    6: [[28, 22], [72, 22], [28, 50], [72, 50], [28, 78], [72, 78]],
};

// Map dice value to the CSS transform that shows that face
const faceRotations = {
    1: 'rotateX(0deg) rotateY(0deg)',       // front
    2: 'rotateY(-90deg)',                    // right
    3: 'rotateX(90deg)',                     // top → face 3
    4: 'rotateX(-90deg)',                    // bottom → face 4
    5: 'rotateY(90deg)',                     // left → face 5
    6: 'rotateX(180deg) rotateY(0deg)',      // back → face 6
};

function DiceFace({ value, className }) {
    const dots = dotPositions[value] || dotPositions[1];
    return (
        <div className={`dice-face ${className}`}>
            {dots.map(([x, y], i) => (
                <div
                    key={i}
                    className="dice-dot"
                    style={{ left: `${x}%`, top: `${y}%` }}
                />
            ))}
        </div>
    );
}

export default function Dice({ value, rolling, onRoll, disabled, playerColor }) {
    const [phase, setPhase] = useState('idle'); // 'idle' | 'spinning' | 'landing'
    const [spinDeg, setSpinDeg] = useState({ x: 0, y: 0, z: 0 });

    useEffect(() => {
        if (rolling) {
            setPhase('spinning');
            // Generate a wild random spin
            setSpinDeg({
                x: 720 + Math.random() * 360,
                y: 720 + Math.random() * 360,
                z: 360 + Math.random() * 180,
            });
        } else if (value && phase === 'spinning') {
            // Spin just ended → land
            setPhase('landing');
            const timer = setTimeout(() => setPhase('idle'), 400);
            return () => clearTimeout(timer);
        }
    }, [rolling, value]);

    // Compute cube transform
    const cubeTransform = useMemo(() => {
        if (phase === 'spinning') {
            return `rotateX(${spinDeg.x}deg) rotateY(${spinDeg.y}deg) rotateZ(${spinDeg.z}deg)`;
        }
        if (value) {
            return faceRotations[value] || faceRotations[1];
        }
        return faceRotations[1];
    }, [phase, spinDeg, value]);

    return (
        <div className="dice-wrapper">
            <button
                className={`dice-button ${rolling ? 'rolling' : ''} ${disabled ? 'disabled' : ''}`}
                onClick={!disabled && !rolling ? onRoll : undefined}
                style={{ '--dice-accent': playerColor || '#E53935' }}
                disabled={disabled || rolling}
                id="roll-dice-btn"
            >
                <div className="dice-scene">
                    <div
                        className={`dice-cube ${phase === 'landing' ? 'landed' : ''}`}
                        style={{ transform: cubeTransform }}
                    >
                        {/* Face 1 - Front */}
                        <DiceFace value={1} className="face-front" />
                        {/* Face 6 - Back */}
                        <DiceFace value={6} className="face-back" />
                        {/* Face 2 - Right */}
                        <DiceFace value={2} className="face-right" />
                        {/* Face 5 - Left */}
                        <DiceFace value={5} className="face-left" />
                        {/* Face 3 - Top */}
                        <DiceFace value={3} className="face-top" />
                        {/* Face 4 - Bottom */}
                        <DiceFace value={4} className="face-bottom" />
                    </div>
                </div>
            </button>

            {!disabled && !rolling && !value && (
                <span className="dice-hint">Tap to roll</span>
            )}
        </div>
    );
}
