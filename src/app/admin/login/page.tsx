"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  LoginState,
  LoginValidator,
} from "@/lib/validators/document-validator";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useForm } from "react-hook-form";
import Cookies from "js-cookie";
import { AUTH_TOKEN } from "@/static";
import { useRouter } from "next-nprogress-bar";

const AdminLoginPage = () => {
  const { toast } = useToast();
  const router = useRouter();
  const form = useForm<LoginState>({
    resolver: zodResolver(LoginValidator),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onSubmit = (values: LoginState) => {
    // console.log(values);
    Cookies.set(AUTH_TOKEN, "eyywe9euew90uew0909ue9", { expires: 1 });
    toast({
      title: "Login Successful",
      type: "foreground",
      duration: 2000,
    });
    router.push("/admin");
  };
  return (
    <main className="flex-grow flex flex-col justify-center items-center p-5 gap-10">
      <h1 className="text-2xl lg:text-3xl font-bold text-primary text-center">
        PsychGen Portal
      </h1>
      <Card className="w-full max-w-2xl shadow-none">
        <CardHeader className="text-center p-10">
          <CardTitle>Welcome Back</CardTitle>
          <CardDescription>Login to your Admin Dashboard</CardDescription>
        </CardHeader>
        <CardContent className="p-10 pt-0">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="gap-6 flex flex-col"
            >
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="">Username</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter your username"
                        {...field}
                        className="h-[50px]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter your password"
                        {...field}
                        className="h-[50px]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="mt-auto h-12"
                // loading={
                //   isCountriesLoading ||
                //   isDisorderLoading ||
                //   isArticleTypesLoading ||
                //   isBiologicalModalitiesLoading ||
                //   isGeneticSourcesLoading
                // }
              >
                Login
              </Button>
              <Link
                href="/admin/forgot-password"
                className="w-fit text-primary mx-auto"
              >
                Forgot Password
              </Link>
            </form>
          </Form>
        </CardContent>
      </Card>
    </main>
  );
};

export default AdminLoginPage;
