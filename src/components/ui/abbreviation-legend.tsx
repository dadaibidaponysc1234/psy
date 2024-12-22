import { Card, CardContent } from "./card";

const AbreviationLegend = ({
  data,
  abbreviationLength = 3,
}: {
  data: { name: string }[];
  abbreviationLength?: number;
}) => {
  return (
    <Card className="sm:mt-8 mt-4 shadow-none">
      <CardContent className="flex items-center sm:justify-center justify-start gap-x-5 gap-y-1 flex-wrap sm:p-5 p-2">
        {data.map((item, index) => (
          <p key={index} className="font-semibold sm:text-sm text-xs">
            {item.name?.slice(0, abbreviationLength) ?? ""} - {item.name}
          </p>
        ))}
      </CardContent>
    </Card>
  );
};

export default AbreviationLegend;
