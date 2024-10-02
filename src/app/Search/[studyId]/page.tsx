import { getDetails } from "@/action/details";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Details } from "@/types/study_detail";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent } from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { notFound } from "next/navigation";

interface pageProps {
  params: {
    studyId: number;
  };
}

const Detail = async ({ params }: pageProps) => {
  const { studyId } = params;

  const detail: Details = await getDetails(studyId);

  // console.log(detail);
  const limitedAuthors = detail?.authors_affiliations?.authors?.slice(0, 3);

  const limitedAffiliationNumbers = new Set<string>();
  limitedAuthors?.forEach((author) => {
    author.affiliation_numbers.forEach((number) => {
      limitedAffiliationNumbers.add(number);
    });
  });

  const date = new Date(detail.date);
  const formattedDate = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });


  if (!detail) {
    return notFound()
  }

  return (
    <div key={detail?.id} className="w-full flex justify-center p-5">
      <section className="hidden w-60 h-fit shrink-0 pr-4 space-y-4 sticky top-20 lg:block">
        <h1 className="text-xl font-semibold">Research Overview</h1>
        <div className="space-y-3">
          <div className="text-primary font-medium">Journal Name</div>
          <p className="text-sm">{detail?.journal_name}</p>
          <div className="text-primary font-medium">PMID</div>
          <p className="text-sm">{detail?.pmid}</p>
          <div className="text-primary font-medium">Year</div>
          <p className="text-sm">{detail?.year}</p>
          <div className="text-primary font-medium">Biological Modal</div>
          <div className="text-sm">{detail?.biological_modalities?.map(modality => (
            <div key={modality.id} className="text-sm">{modality.modality_name}</div>
          ))}</div>
          <div className="text-primary font-medium">Biological Risk</div>
          <p className="text-sm">{detail?.biological_risk_factor_studied}</p>
          <div className="text-primary font-medium">Citation</div>
          <p className="text-sm">{detail?.citation}</p>
          <div className="text-primary font-medium">Disorder</div>
          <div>
            {detail?.disorder?.map((disorder) => (
              <div key={disorder.id} className="text-sm">
                {disorder.disorder_name}
              </div>
            ))}
          </div>
          <div className="text-primary font-medium">Phenotype</div>
          <p className="text-sm">{detail?.phenotype}</p>
          <div className="text-primary font-medium">Region</div>
          <div>
            {detail?.countries?.map(country => (
              <div key={country.id} className="text-sm">
                <p>{country.name}</p>
              </div>
            ))}
          </div>
          <div className="text-primary font-medium">Sample Size</div>
          <p className="text-sm">{detail?.sample_size}</p>
          <div className="text-primary font-medium">Age Range</div>
          <p className="text-sm">{detail?.age_range}</p>
          <div className="text-primary font-medium">Gender</div>
          <p className="text-sm">{detail?.male_female_split}</p>
          <div className="text-primary font-medium">Genetic Source Material</div>
          <div className="text-sm">{detail?.genetic_source_materials?.map(gsm => (
            <p key={gsm.id} className="text-sm">
              {gsm.material_type}
            </p>
          ))}</div>
          <div className="text-primary font-medium">Article Type</div>
          <div>
            {detail?.article_type?.map((article) => (
              <div key={article.id} className="text-sm">
                {article.article_name}
              </div>
            ))}
          </div>
          <div className="text-primary font-medium">Study Design</div>
          <p className="text-sm">{detail?.study_designs}</p>
        </div>
      </section>

      <div className="max-w-4xl flex flex-col justify-center gap-2">
        <div className='font-semibold space-y-1'>
          <div className='space-x-1'>
            <span>{detail.journal_name},</span>{" "}
            <span>Vol.{detail.volume},</span>{" "}
            <span>{formattedDate},</span>{" "}
            <span>pp.{detail.pages}</span>{" "}
          </div>
          <div>
            <span>ISSN:{" "}{detail.issue}</span>{" "}
          </div>
          <div>
            DOI:{" "}<span>{detail.DOI}</span>
          </div>
        </div>

        <h2 className="font-bold text-xl lg:text-3xl tracking-tight">{detail?.title}</h2>
        {/* <p className="text-muted-foreground underline">{detail?.lead_author}</p> */}
        <p className="text-blue-700 text-sm">Share publication</p>
        <div className="h-1 w-full bg-slate-500" />

        <div>

          <div className="w-full flex items-center justify-between">
            <h2 className='text-primary text-xl mt-4 mb-3'>Authors</h2>

            <div className="flex py-2">
              <DropdownMenu>
                <DropdownMenuTrigger className="flex justify-center font-medium text-gray-700 hover:bg-gray-50 border px-4 py-1 rounded-sm">
                  All Authors
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {detail?.authors_affiliations?.authors?.map((author, i) => (
                    <div className="text-left w-full  px-4 py-2 text-sm" key={i}>
                      -{author.name}
                    </div>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

          </div>

          <div className="w-full flex flex-col gap-2 md:flex-row lg:gap-10 font-bold ">
            {limitedAuthors?.map((author, index) => (
              <div key={index}>

                {author?.affiliation_numbers
                  .map((affiliationNumber, index) => (
                    <sup className='font-medium text-lg' key={affiliationNumber}>
                      {affiliationNumber}
                      {index < author.affiliation_numbers.length - 1 && ','}
                    </sup>
                  ))}

                {author.name}
              </div>
            ))}
          </div>

          <div className="w-full flex flex-col gap-2 my-3">
            <h2 className='text-primary text-xl mt-4 mb-3'>Affiliations</h2>

            {Array.from(limitedAffiliationNumbers).map((key: any) => (
              <p key={key} className='font-medium'>
                <sup className='font-medium text-lg'>{key}</sup> {detail?.authors_affiliations?.affiliations[key]}
              </p>
            ))}
          </div>

        </div>

        <h3 className="text-primary text-xl">Abstract</h3>
        <p>
          {detail.abstract}
        </p>

        <div className='font-medium'>
          <span className='text-primary text-xl'>Keyword</span>:{" "}
          <span className='font-semibold'>{detail.keyword}</span>
        </div>

        <div className="mx-auto mt-20 space-x-3 lg:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline">Related Search</Button>
            </SheetTrigger>
            <SheetContent className="flex flex-col overflow-y-auto">
              <SheetHeader>
                <SheetTitle className="text-xl font-semibold my-5">Related Search</SheetTitle>
                {/* <SheetDescription>
                  Make changes to your profile here. Click save when you&apos;re
                  done.
                </SheetDescription> */}
              </SheetHeader>
              <div className="space-y-4">
                {detail?.recommended_articles?.map((article) => (
                  <div
                    key={article.id}
                    className="hover:underline hover:cursor-pointer"
                  >
                    <Link
                      href={`/Search/${article.id}`}
                      className="text-blue-600">
                      {article.title}
                    </Link>
                    <p>{article.lead_author}</p>
                    <p className="text-muted-foreground">{article.year}</p>
                  </div>
                ))}
              </div>
            </SheetContent>
          </Sheet>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline">Research Overview</Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Research Overview</SheetTitle>
                <SheetDescription>
                  Make changes to your profile here. Click save when you&apos;re
                  done.
                </SheetDescription>
              </SheetHeader>

              <SheetFooter>
                <SheetClose asChild>
                  <Button type="submit">Save changes</Button>
                </SheetClose>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <section className="hidden w-64 h-fit shrink-0 pl-6 space-y-4 sticky top-20 lg:block">
        <h1 className="text-xl font-semibold">Related Search</h1>
        <div className="text-sm flex flex-col gap-4">
          {detail?.recommended_articles?.map((article) => (
            <div
              key={article.id}
              className="hover:underline hover:cursor-pointer "
            >
              <Link
                href={`/Search/${article.id}`}
                className="font-medium text-blue-600">
                {article.title}
              </Link>
              <p className="text-gray-800">{article.lead_author}</p>
              <p className="text-muted-foreground">{article.year}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Detail;
