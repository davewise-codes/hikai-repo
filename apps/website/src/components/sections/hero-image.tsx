"use client";

import { useState } from "react";
import Image from "next/image";

export function HeroImage() {
	const [isLoaded, setIsLoaded] = useState(false);

	return (
		<div className="mt-12 relative">
			<div className="relative mx-auto max-w-4xl">
				{/* Background blur effect */}
				<div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-2xl blur-3xl opacity-30" />

				{/* Main image container */}
				<div className="relative bg-card border rounded-2xl shadow-2xl overflow-hidden">
					<Image
						src="/hero-light.png"
						alt="Hikai Platform Preview"
						width={1200}
						height={600}
						className={`w-full h-auto transition-opacity duration-500 ${
							isLoaded ? "opacity-100" : "opacity-0"
						}`}
						priority
						onLoad={() => setIsLoaded(true)}
					/>

					{/* Loading placeholder */}
					{!isLoaded && (
						<div className="absolute inset-0 bg-muted animate-pulse flex items-center justify-center">
							<div className="text-muted-foreground">Loading...</div>
						</div>
					)}

					{/* Overlay gradient for depth */}
					<div className="absolute inset-0 bg-gradient-to-t from-background/5 to-transparent" />
				</div>
			</div>
		</div>
	);
}