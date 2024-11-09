import UploadEntry from "@/components/admin/upload-entry";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import DropBox from "@/components/ui/drop-box";
import { Input } from "@/components/ui/input";
import Image from "next/image";

const AdminPage = () => {
  return (
    <div className="flex flex-col gap-5">
      <Input
        placeholder="Start typing"
        className="h-14 rounded-lg text-base px-4"
      />
      <section className="flex items-center gap-5 w-full text-center">
        <Card className="w-full h-[120px]">
          <CardContent className="p-6">
            <CardTitle className="text-[#5A3A31] text-4xl">305</CardTitle>
            <CardDescription className="text-2xl text-black">
              Papers
            </CardDescription>
          </CardContent>
        </Card>
        <Card className="w-full h-[120px]">
          <CardContent className="p-6">
            <CardTitle className="text-[#5A3A31] text-4xl">1,636</CardTitle>
            <CardDescription className="text-2xl text-black">
              Papers
            </CardDescription>
          </CardContent>
        </Card>
      </section>
      <section className="grid grid-cols-2 gap-5 w-full h-full">
        <Card className="w-full min-h-80 h-full">
          <CardContent className="p-6 flex flex-col h-full">
            <UploadEntry />
          </CardContent>
        </Card>
        <Card className="w-full min-h-80 h-full">
          <CardContent className="p-6 flex flex-col h-full">
            <p className="text-xl mb-3">Recent Activities</p>
            <div className="h-full flex flex-col gap-2 overflow-auto">
              <p className="text-primary font-medium">Yesterday</p>
              <p>
                @essien added Lateralization of hand skill in bipolar affective
                disorder
              </p>
              <p>
                @demilade deleted MLPA subtelomere analysis in Tunisian mentally
                retarded patients
              </p>
              <p>
                @demilade deleted MLPA subtelomere analysis in Tunisian mentally
                retarded patients
              </p>
              <p>
                @demilade deleted MLPA subtelomere analysis in Tunisian mentally
                retarded patients
              </p>
              <p>
                @demilade deleted MLPA subtelomere analysis in Tunisian mentally
                retarded patients
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
      <Card className="w-full h-80">
        <CardContent className="p-6 h-full flex flex-col justify-center items-center">
          <CardTitle className="text-[#5A3A31] text-4xl">Insert</CardTitle>
          <CardDescription className="text-2xl text-black">
            Graph Here
          </CardDescription>
        </CardContent>
      </Card>
      <section className="flex gap-5 w-full">
        <Card className="w-full h-80">
          <CardContent className="p-6 flex flex-col h-full">
            <p className="text-xl mb-4">Most Viewed Paper</p>
            <p className="mb-3 font-medium text-[#5A3A31]">
              Genetics and personality traits in patients with social anxiety
              disorder: a case-control study in South Africa
            </p>
            <p>Christine Lochner</p>
          </CardContent>
        </Card>
        <section className="grid grid-cols-1 gap-5 w-full h-full">
          <Card className="w-full h-full">
            <CardContent className="p-6 flex flex-col h-full">
              <p className="text-xl mb-4">Most Popular Disorder</p>
              <p className="mb-3 font-medium text-[#5A3A31]">Depression</p>
            </CardContent>
          </Card>
          <Card className="w-full h-full">
            <CardContent className="p-6 flex flex-col h-full">
              <p className="text-xl mb-4">Most Viewed Region</p>
              <p className="mb-3 font-medium text-[#5A3A31]">South Africa</p>
            </CardContent>
          </Card>
        </section>
      </section>
      <section className="flex gap-5 w-full">
        <Card className="w-full h-80">
          <CardContent className="p-6 flex flex-col h-full">
            <p className="text-xl mb-4">Visitors</p>
          </CardContent>
        </Card>
        <Card className="w-full h-80">
          <CardContent className="p-6 flex flex-col h-full">
            <p className="text-xl mb-4">Search Keywords</p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
};

export default AdminPage;
