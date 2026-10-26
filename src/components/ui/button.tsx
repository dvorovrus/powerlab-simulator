import * as React from 'react';
import {Slot} from '@radix-ui/react-slot';
import {cva,type VariantProps} from 'class-variance-authority';
import {cn} from '../../lib/utils';
export const buttonVariants=cva('ui-button',{variants:{variant:{default:'ui-button-default',outline:'ui-button-outline',ghost:'ui-button-ghost'},size:{default:'ui-button-md',sm:'ui-button-sm',icon:'ui-button-icon'}},defaultVariants:{variant:'default',size:'default'}});
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>,VariantProps<typeof buttonVariants>{asChild?:boolean}
export const Button=React.forwardRef<HTMLButtonElement,ButtonProps>(function Button({className,variant,size,asChild=false,type='button',...props},ref){const Comp=asChild?Slot:'button';return <Comp ref={ref} type={type} className={cn(buttonVariants({variant,size}),className)} {...props}/>});
