import { Box } from '@mui/material';
import { keyframes } from '@mui/system';

const bounce = keyframes`
  0%, 100% { transform: scaleY(0.3); }
  50% { transform: scaleY(1); }
`;

interface Props {
  playing: boolean;
}

/** A small CSS bar visualizer that animates only while audio is playing. */
export default function Visualizer({ playing }: Props): JSX.Element {
  const bars = Array.from({ length: 7 });
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: 28, width: 40 }}>
      {bars.map((_, i) => (
        <Box
          key={i}
          sx={{
            width: 4,
            height: '100%',
            borderRadius: 2,
            background: 'linear-gradient(180deg,#8b5cf6,#3b82f6)',
            transformOrigin: 'bottom',
            animation: `${bounce} ${0.8 + i * 0.12}s ease-in-out infinite`,
            animationPlayState: playing ? 'running' : 'paused',
            opacity: playing ? 1 : 0.4,
          }}
        />
      ))}
    </Box>
  );
}
