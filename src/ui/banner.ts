import gradient from "gradient-string";
import { gradientColors } from "./theme.js";

const bannerGradient = gradient([...gradientColors.banner]);

const BANNER = `

           d8,                         
          \`8P                          
                                       
?88   d8P  88b d8888b d8888b   88bd88b 
d88  d8P'  88Pd8P' \`Pd8P' ?88  88P' ?8b
?8b ,88'  d88 88b    88b  d88 d88   88P
\`?888P'  d88' \`?888P'\`?8888P'd88'   88b
                                       
                                       
                                       
`;

/**
 * Display the ASCII art banner with gradient colors
 */
export function showBanner(): void {
	console.log(bannerGradient(BANNER));
}
