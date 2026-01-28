/**
 * New Joining Form Page
 * Comprehensive employee onboarding form with multiple sections
 */

import { useParams } from "react-router-dom";
import JoiningForm from "./JoiningForm";

const JoiningFormPage = () => {
  const { id } = useParams<{ id: string }>();
  return <JoiningForm profileId={id} />;
};

export default JoiningFormPage;
