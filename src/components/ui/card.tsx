import * as React from 'react';
import {cn} from '../../lib/utils';
export const Card=React.forwardRef<HTMLDivElement,React.ComponentProps<'div'>>(function Card({className,...props},ref){return <div ref={ref} className={cn('ui-card',className)} {...props}/>});
