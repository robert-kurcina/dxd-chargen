import {
  Sword,
  Wind,
  BrainCircuit,
  Shield,
  Eye,
  Smile,
  Loader2,
  Dices,
} from 'lucide-react';

const AffinityIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <path d="M12 2L22 12L12 22L2 12L12 2Z" fill="black" />
        <circle cx="12" cy="12" r="8" fill="white" />
        <path d="M12 7L7 17H17L12 7Z" fill="black" />
        <path d="M9.5 14H14.5" stroke="white" strokeWidth="1.5" />
    </svg>
);

const StarIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 40 38" {...props} strokeWidth="0.5" stroke="black">
    <path d="M20,2 L25.16,13.88 L38.04,14.69 L28.3,23.1 L30.9,35.81 L20,29.35 L9.1,35.81 L11.7,23.1 L1.96,14.69 L14.84,13.88 Z" fill="#FFC700"/>
    <ellipse cx="20" cy="12" rx="2.5" ry="4" fill="white" opacity="0.9" stroke="none" />
    <ellipse cx="29" cy="18" rx="2.5" ry="1.5" fill="white" opacity="0.7" stroke="none" transform="rotate(30 29 18)" />
    <ellipse cx="11" cy="18" rx="2.5" ry="1.5" fill="white" opacity="0.7" stroke="none" transform="rotate(-30 11 18)" />
  </svg>
);

export const Icons = {
  Strength: Sword,
  Agility: Wind,
  Intelligence: BrainCircuit,
  Willpower: Shield,
  Perception: Eye,
  Charisma: Smile,
  Loader: Loader2,
  Dices,
  Affinity: AffinityIcon,
  Star: StarIcon,
};
