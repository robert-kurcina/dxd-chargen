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
    <svg viewBox="0 0 24 24" fill="black" xmlns="http://www.w3.org/2000/svg" {...props}>
        {/* Ring */}
        <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2ZM4 12C4 7.58172 7.58172 4 12 4C16.4183 4 20 7.58172 20 12C20 16.4183 16.4183 20 12 20C7.58172 20 4 16.4183 4 12Z" />
        {/* "No" symbol */}
        <path fillRule="evenodd" clipRule="evenodd" d="M12 8C9.79086 8 8 9.79086 8 12C8 14.2091 9.79086 16 12 16C14.2091 16 16 14.2091 16 12C16 9.79086 14.2091 8 12 8ZM10 12C10 10.8954 10.8954 10 12 10C13.1046 10 14 10.8954 14 12C14 13.1046 13.1046 14 12 14C10.8954 14 10 13.1046 10 12Z" />
        <path d="M15.5355 8.46448L8.46448 15.5355L7.75736 14.8284L14.8284 7.75736L15.5355 8.46448Z" />
        {/* Flames */}
        <path d="M18.5 2L17 5L15.5 2Z" />
        <path d="M22 6L19 5L22 4Z" />
        <path d="M21 9.5L18 8L19.5 11Z" />
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
