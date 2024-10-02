import { cn } from "@/lib/utils";
import { Button } from "./ui/button";

interface filterButtonProps {
    name: string,
    className?: string
    type?: "link" | "default" | "destructive" | "outline" | "secondary" | "ghost" | null | undefined
    onClick?: () => void 

}


const FilterButton = ({ name, className, type, onClick }: filterButtonProps) => {
    return (
        <Button
            variant={type}
            className={cn('', className)}
            onClick={onClick}
        >
            {name}
        </Button>
    )
}

export default FilterButton;