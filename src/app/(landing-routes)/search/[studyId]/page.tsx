import { getDetails } from "@/action/details"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Details } from "@/types/study_detail"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from "@/components/ui/dropdown-menu"
import Link from "next/link"
import { notFound } from "next/navigation"
import SharePublication from "@/components/share-publication"

interface pageProps {
  params: {
    studyId: number
  }
}

const Detail = async ({ params }: pageProps) => {
  const { studyId } = params

  const detail: Details = await getDetails(studyId)

  // console.log(detail);
  const limitedAuthors = detail?.authors_affiliations?.authors?.slice(0, 3)

  const limitedAffiliationNumbers = new Set<string>()
  limitedAuthors?.forEach((author) => {
    author.affiliation_numbers.forEach((number) => {
      limitedAffiliationNumbers.add(number)
    })
  })

  const date = new Date(detail.date)
  const formattedDate = date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
  })

  if (!detail) {
    return notFound()
  }

  return (
    <div key={detail?.id} className="flex w-full justify-center p-5">
      <section className="sticky top-20 hidden h-fit w-60 shrink-0 space-y-4 pr-4 lg:block">
        <h1 className="text-xl font-semibold">Research Overview</h1>
        <div className="space-y-3">
          <div className="font-medium text-primary">Journal Name</div>
          <p className="text-sm">{detail?.journal_name}</p>
          <div className="font-medium text-primary">PMID</div>
          <p className="text-sm">{detail?.pmid}</p>
          <div className="font-medium text-primary">Year</div>
          <p className="text-sm">{detail?.year}</p>
          <div className="font-medium text-primary">Biological Modal</div>
          <div className="text-sm">
            {detail?.biological_modalities?.map((modality) => (
              <div key={modality.id} className="text-sm">
                {modality.modality_name}
              </div>
            ))}
          </div>
          <div className="font-medium text-primary">Biological Risk</div>
          <p className="text-sm">{detail?.biological_risk_factor_studied}</p>
          <div className="font-medium text-primary">Citation</div>
          <p className="text-sm">{detail?.citation}</p>
          <div className="font-medium text-primary">Disorder</div>
          <div>
            {detail?.disorder?.map((disorder) => (
              <div key={disorder.id} className="text-sm">
                {disorder.disorder_name}
              </div>
            ))}
          </div>
          <div className="font-medium text-primary">Phenotype</div>
          <p className="text-sm">{detail?.phenotype}</p>
          <div className="font-medium text-primary">Region</div>
          <div>
            {detail?.countries?.map((country) => (
              <div key={country.id} className="text-sm">
                <p>{country.name}</p>
              </div>
            ))}
          </div>
          <div className="font-medium text-primary">Sample Size</div>
          <p className="text-sm">{detail?.sample_size}</p>
          <div className="font-medium text-primary">Age Range</div>
          <p className="text-sm">{detail?.age_range}</p>
          <div className="font-medium text-primary">Gender</div>
          <p className="text-sm">{detail?.male_female_split}</p>
          <div className="font-medium text-primary">
            Genetic Source Material
          </div>
          <div className="text-sm">
            {detail?.genetic_source_materials?.map((gsm) => (
              <p key={gsm.id} className="text-sm">
                {gsm.material_type}
              </p>
            ))}
          </div>
          <div className="font-medium text-primary">Article Type</div>
          <div>
            {detail?.article_type?.map((article) => (
              <div key={article.id} className="text-sm">
                {article.article_name}
              </div>
            ))}
          </div>
          <div className="font-medium text-primary">Study Design</div>
          <p className="text-sm">{detail?.study_designs}</p>
        </div>
      </section>

      <div className="flex max-w-4xl flex-col justify-center gap-2">
        <div className="space-y-1 font-semibold">
          <div className="space-x-1">
            <span>{detail.journal_name},</span>{" "}
            <span>Vol.{detail.volume},</span> <span>{formattedDate},</span>{" "}
            <span>pp.{detail.pages}</span>{" "}
          </div>
          <div>
            <span>ISSN: {detail.issue}</span>{" "}
          </div>
          <div>
            DOI:{" "}
            <a
              href={`https://doi.org/${detail.DOI}`}
              target="_blank"
              className="text-blue-600 hover:underline"
            >
              https://doi.org/{detail.DOI}
            </a>
          </div>
        </div>

        <h2 className="text-xl font-bold tracking-tight lg:text-3xl">
          {detail?.title}
        </h2>
        {/* <p className="text-muted-foreground underline">{detail?.lead_author}</p> */}
        <SharePublication {...detail} />
        <div className="h-1 w-full bg-slate-500" />

        <div>
          <div className="flex w-full items-center justify-between">
            <h2 className="mb-3 mt-4 text-xl text-primary">Authors</h2>

            <div className="flex py-2">
              <DropdownMenu>
                <DropdownMenuTrigger className="flex justify-center rounded-sm border px-4 py-1 font-medium text-gray-700 hover:bg-gray-50">
                  All Authors
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {detail?.authors_affiliations?.authors?.map((author, i) => (
                    <div className="w-full px-4 py-2 text-left text-sm" key={i}>
                      -{author.name}
                    </div>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="flex w-full flex-col gap-2 font-bold md:flex-row lg:gap-10">
            {limitedAuthors?.map((author, index) => (
              <div key={index}>
                {author?.affiliation_numbers.map((affiliationNumber, index) => (
                  <sup className="text-lg font-medium" key={affiliationNumber}>
                    {affiliationNumber}
                    {index < author.affiliation_numbers.length - 1 && ","}
                  </sup>
                ))}

                {author.name}
              </div>
            ))}
          </div>

          <div className="my-3 flex w-full flex-col gap-2">
            <h2 className="mb-3 mt-4 text-xl text-primary">Affiliations</h2>

            {Array.from(limitedAffiliationNumbers).map((key: any) => (
              <p key={key} className="font-medium">
                <sup className="text-lg font-medium">{key}</sup>{" "}
                {detail?.authors_affiliations?.affiliations[key]}
              </p>
            ))}
          </div>
        </div>

        <h3 className="text-xl text-primary">Abstract</h3>
        <p>{detail.abstract}</p>

        <div className="font-medium">
          <span className="text-xl text-primary">Keyword</span>:{" "}
          <span className="font-semibold">{detail.keyword}</span>
        </div>

        <div className="mx-auto mt-20 space-x-3 lg:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline">Related Search</Button>
            </SheetTrigger>
            <SheetContent className="flex flex-col overflow-y-auto">
              <SheetHeader>
                <SheetTitle className="my-5 text-xl font-semibold">
                  Related Search
                </SheetTitle>
                {/* <SheetDescription>
                  Make changes to your profile here. Click save when you&apos;re
                  done.
                </SheetDescription> */}
              </SheetHeader>
              <div className="space-y-4">
                {detail?.recommended_articles?.map((article) => (
                  <div
                    key={article.id}
                    className="hover:cursor-pointer hover:underline"
                  >
                    <Link
                      href={`/search/${article.id}`}
                      className="text-blue-600"
                    >
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

      <section className="sticky top-20 hidden h-fit w-64 shrink-0 space-y-4 pl-6 lg:block">
        <h1 className="text-xl font-semibold">Related Search</h1>
        <div className="flex flex-col gap-4 text-sm">
          {detail?.recommended_articles?.map((article) => (
            <div
              key={article.id}
              className="hover:cursor-pointer hover:underline"
            >
              <Link
                href={`/search/${article.id}`}
                className="font-medium text-blue-600"
              >
                {article.title}
              </Link>
              <p className="text-gray-800">{article.lead_author}</p>
              <p className="text-muted-foreground">{article.year}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

export default Detail
