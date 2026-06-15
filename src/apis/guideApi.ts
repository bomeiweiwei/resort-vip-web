export type GuideAnalyzeResponse = {
  success: boolean;
};

export const analyzeGuideImage = async (): Promise<GuideAnalyzeResponse> => {
  await new Promise((resolve) => setTimeout(resolve, 3000));

  return {
    success: true,
  };
};