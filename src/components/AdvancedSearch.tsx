import { Button } from "@/components/ui/button";
import {
  DocumentFilterValidator,
  DocumentState,
} from "@/lib/validators/document-validator";
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
import { SetStateAction } from "react";

const AdvancedSearch = ({
  filters,
  setFilters,
}: {
  setFilters: React.Dispatch<SetStateAction<DocumentState>>;
  filters: DocumentState;
}) => {
  const form = useForm<DocumentState>({
    resolver: zodResolver(DocumentFilterValidator),
    defaultValues: filters,
  });

  function onSubmit(values: DocumentState) {
    setFilters(values);
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="gap-4 grid grid-cols-3"
      >
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

        {/* <DialogFooter className="w-full">
          <Button type="submit" className="flex justify-end">
            Search
          </Button>
        </DialogFooter> */}
      </form>
    </Form>
  );
};

export default AdvancedSearch;
