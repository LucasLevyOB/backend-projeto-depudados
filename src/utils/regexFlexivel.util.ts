export const regexFlexivel = (termo: string) => {
    const mapaAcentos: Record<string, string> = {
        'a': '[aáàãâä]',
        'e': '[eéèêë]',
        'i': '[iíìîï]',
        'o': '[oóòõôö]',
        'u': '[uúùûü]',
        'c': '[cç]'
    };

    const regexStr = termo.split('').map(char => {
        return mapaAcentos[char.toLowerCase()] || char;
    }).join('');

    return regexStr;
};
