"use client";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "./ui/button";
import { Search } from "lucide-react"

const searchPublicationSchema = z.object({
  publication: z.string().min(3, {
    message: "Username must be at least 2 characters.",
  }),
});

const SearchField = () => {
  const form = useForm<z.infer<typeof searchPublicationSchema>>({
    resolver: zodResolver(searchPublicationSchema),
    defaultValues: {
      publication: "",
    },
  });

  function onSubmit(values: z.infer<typeof searchPublicationSchema>) {
    // Do something with the form values.
    // ✅ This will be type-safe and validated.
    console.log(values);
  }
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className=" flex flex-row ">
        <FormField
          control={form.control}
          name="publication"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input
                  placeholder="Search for titles, keywords, PMID, authors, etc."
                  {...field}
                  className="w-[40vw] "
                />
              </FormControl>
              {/* <FormDescription>
                  This is your public display name.
                </FormDescription> */}
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit"><Search className="h-4 w-4"/></Button>
      </form>
    </Form>
  );
};

export default SearchField;
