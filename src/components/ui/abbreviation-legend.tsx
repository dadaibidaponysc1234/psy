import { Card, CardContent } from "./card";

const AbreviationLegend = ({
  data,
  abbreviationLength = 3,
}: {
  data: { name: string }[];
  abbreviationLength?: number;
}) => {
  return (
    <Card className="my-8 shadow-none">
      <CardContent className="flex items-center justify-center gap-x-5 gap-y-1 flex-wrap p-5">
        {data.map((item, index) => (
          <p key={index}>
            {item.name?.slice(0, abbreviationLength) ?? ""} - {item.name}
          </p>
        ))}
      </CardContent>
    </Card>
  );
};

export default AbreviationLegend;
