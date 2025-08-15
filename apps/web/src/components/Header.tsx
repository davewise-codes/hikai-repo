import { Navbar } from "./Navbar";
import {
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuContent,
	DropdownMenuItem,
} from "@repo/ui";

export function Header() {
	return (
		<header className="p-4 flex items-center justify-between">
			<Navbar />
			<DropdownMenu>
				<DropdownMenuTrigger>eng</DropdownMenuTrigger>
				<DropdownMenuContent>
					<DropdownMenuItem>English</DropdownMenuItem>
					<DropdownMenuItem>Español</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</header>
	);
}
