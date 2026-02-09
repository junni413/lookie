
export const uploadService = {
    /**
     * 이미지를 업로드하고 URL을 반환합니다.
     * Phase 1: 임시로 더미/DataURL 반환
     * Phase 2: 실제 Nginx/S3 업로드 구현 예정
     */
    uploadImage: async (file: File): Promise<string> => {
        // Phase 1: 실제 업로드 없이 로컬 Fake URL 반환 (or dataURL)
        // 백엔드가 500 에러를 뱉지 않도록 유효한 포맷의 string을 보내야 한다면,
        // 일단 dataUrl을 보내거나, 짧은 임시 string을 보냄.

        // 만약 백엔드가 URL 형식을 검증한다면 http://... 형식이 필요.
        // 여기서는 임시로 랜덤 이미지를 반환하거나 로컬 blob을 반환.

        // 시연용: 그냥 성공 처리 하고 임시 URL 리턴
        await new Promise((resolve) => setTimeout(resolve, 500));

        // DataURL로 변환해서 줄 수도 있음 (백엔드가 길이 제한이 없다면)
        // return new Promise((resolve) => {
        //   const reader = new FileReader();
        //   reader.onloadend = () => resolve(reader.result as string);
        //   reader.readAsDataURL(file);
        // });

        return `http://dummy-image-url.com/${file.name}`;
    }
};
