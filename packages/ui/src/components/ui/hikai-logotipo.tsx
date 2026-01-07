import * as React from "react";

import { HikaiIsotipo, type HikaiIsotipoProps } from "./hikai-isotipo";

export interface HikaiLogotipoProps extends HikaiIsotipoProps {}

const HikaiLogotipo = React.forwardRef<SVGSVGElement, HikaiLogotipoProps>(
	(props, ref) => <HikaiIsotipo ref={ref} {...props} />,
);
HikaiLogotipo.displayName = "HikaiLogotipo";

export { HikaiLogotipo };
