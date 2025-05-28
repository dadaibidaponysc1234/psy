import { Study } from "@/types/studyViewList"
import Link from "next/link"

interface studyListProps {
  study: Study
}

const StudyList = ({ study }: studyListProps) => {
  console.log("look at me")
  console.log(study, "study")

  return (
    <div key={study.id} className="flex w-full flex-col gap-6">
      <div className="max-w-4xl space-y-1">
        {study.article_type?.map((a, index) => (
          <div key={index} className="font-medium text-[#5A3A31]">
            {a.article_name}
          </div>
        ))}
        <Link
          href={`/search/${study.id}`}
          className="text-balance text-xl font-semibold tracking-tight hover:text-gray-600"
        >
          {study.title}
        </Link>
        <div className="text-gray-800">
          {study.journal_name}, {study.year}
        </div>
        First Author:{" "}
        <span className="text-muted-foreground">{study.lead_author}</span>
      </div>
    </div>
  )
}

export default StudyList
