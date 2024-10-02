"use client"
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

const searchPublicationSchema = z.object({
  publication: z.string().min(3, {
    message: "Username must be at least 2 characters.",
  }),
});

const SearchPublication = () => {
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="publication"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input placeholder="Search Publication" {...field} className="w-fit " />
              </FormControl>
              {/* <FormDescription>
                This is your public display name.
              </FormDescription> */}
              <FormMessage />
            </FormItem>
          )}
        />
        {/* <Button type="submit">Submit</Button> */}
      </form>
    </Form>
  );
};

export default SearchPublication;
