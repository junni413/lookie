import { useEffect } from "react";
import { useOutletContext } from "react-router-dom";

type Ctx = { setTitle: (t: string) => void };

export default function WorkHistory() {
  const { setTitle } = useOutletContext<Ctx>();

  useEffect(() => setTitle("근무 이력 조회"), [setTitle]);

  return <div className="text-sm text-gray-600">TODO: 근무 이력 조회 화면</div>;
}
