import { Study } from "@/types/studyViewList";
import Link from "next/link";

interface studyListProps {
    study: Study;
}

const StudyList = ({ study }: studyListProps) => {
    // console.log(study);

    return (
        <div key={study.id} className="w-full flex flex-col gap-6 my-5">
            <div className="max-w-4xl space-y-1">
                {study.article_type.map((a, index) => (
                    <div key={index} className="font-medium text-[#5A3A31]">
                        {a.article_name}
                    </div>
                ))}
                <Link
                    href={`/Search/${study.id}`}
                    className="text-xl font-semibold tracking-tight text-balance hover:text-gray-600">
                    {study.title}
                </Link>
                <div className="text-gray-800">
                    {study.journal_name},{" "}{study.year}
                </div>
                <p className="text-muted-foreground">{study.lead_author}</p>
            </div>
        </div>
    );
};

export default StudyList;
