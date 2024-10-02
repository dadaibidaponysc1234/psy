import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { DocumentFilterValidator, DocumentState } from "@/lib/validators/document-validator";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";


interface ChildComponentProps {
    setFilter: React.Dispatch<React.SetStateAction<DocumentState>>;
}


const AdvancedSearch: React.FC<ChildComponentProps> = ({ setFilter }) => {
    const form = useForm<DocumentState>({
        resolver: zodResolver(DocumentFilterValidator),
        defaultValues: {
            searchTerm: "",
            region: "",
            disorder: "",
            article: "",
            year: "",
        },
    });

    function onSubmit(values: DocumentState) {
        setFilter(values);
    }


    return <Dialog>
        <DialogTrigger asChild>
            <Button variant="link" className="w-fit self-center">Use Advanced Search</Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
                <DialogTitle>Use Advanced Search</DialogTitle>
                {/* <DialogDescription>
                    Make changes to your profile here. Click save when you're done.
                </DialogDescription> */}
            </DialogHeader>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="">
                        <FormField
                            control={form.control}
                            name="searchTerm"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="">Search</FormLabel>
                                    <FormControl>
                                        <Input placeholder="In the Article" {...field} className="" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                    <div className="">
                        <FormField
                            control={form.control}
                            name="article"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="">Article</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Research Study" {...field} className="" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                    <div className="">
                        <FormField
                            control={form.control}
                            name="region"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="">Region</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Northern Africa" {...field} className="" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                    <div className="">
                        <FormField
                            control={form.control}
                            name="disorder"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="">Disorder</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Depression" {...field} className="" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                    <div className="">
                        <FormField
                            control={form.control}
                            name="year"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="">Year</FormLabel>
                                    <FormControl>
                                        <Input placeholder="2020" {...field} className="" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>


                    <DialogFooter className="w-full">
                        <Button type="submit" className="flex justify-end">Search</Button>
                    </DialogFooter>
                </form>
            </Form>
        </DialogContent>
    </Dialog>
}

export default AdvancedSearch;