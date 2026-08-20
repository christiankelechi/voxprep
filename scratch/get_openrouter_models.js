const fetchModels = async () => {
    try {
        const response = await fetch("https://openrouter.ai/api/v1/models");
        const data = await response.json();
        const freeModels = data.data.filter(m => m.id.includes("free"));
        console.log(freeModels.map(m => m.id));
    } catch (e) {
        console.error(e);
    }
};
fetchModels();
