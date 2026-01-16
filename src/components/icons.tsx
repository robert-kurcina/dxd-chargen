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
  <svg viewBox="0 0 24 24" stroke="black" strokeWidth="1" {...props}>
    <path fill="yellow" d="M12,17.27L18.18,21L16.74,13.97L22,9.24L14.81,8.62L12,2L9.19,8.62L2,9.24L7.26,13.97L5.82,21L12,17.27Z" />
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
