window.FORMULAS = [
  /* Числа и вычисления */
  { section: "num", name: "Свойства степеней", f: "a^{m}\\cdot a^{n}=a^{m+n},\\quad \\dfrac{a^{m}}{a^{n}}=a^{m-n},\\quad (a^{m})^{n}=a^{mn}" },
  { section: "num", name: "Свойства корней", f: "\\sqrt{ab}=\\sqrt{a}\\cdot\\sqrt{b},\\quad \\sqrt{\\dfrac{a}{b}}=\\dfrac{\\sqrt{a}}{\\sqrt{b}},\\quad (\\sqrt{a})^{2}=a" },
  { section: "num", name: "Логарифмы: произведение и частное", f: "\\log_{a}(bc)=\\log_{a}b+\\log_{a}c,\\quad \\log_{a}\\dfrac{b}{c}=\\log_{a}b-\\log_{a}c" },
  { section: "num", name: "Логарифмы: степень и основное тождество", f: "\\log_{a}b^{n}=n\\log_{a}b,\\quad a^{\\log_{a}b}=b" },
  { section: "num", name: "Проценты", f: "p\\%\\ \\text{от}\\ x = x\\cdot\\dfrac{p}{100}" },

  /* Выражения */
  { section: "expr", name: "Квадрат суммы и разности", f: "(a\\pm b)^{2}=a^{2}\\pm 2ab+b^{2}" },
  { section: "expr", name: "Разность квадратов", f: "a^{2}-b^{2}=(a-b)(a+b)" },
  { section: "expr", name: "Куб суммы и разности", f: "(a\\pm b)^{3}=a^{3}\\pm 3a^{2}b+3ab^{2}\\pm b^{3}" },
  { section: "expr", name: "Сумма и разность кубов", f: "a^{3}\\pm b^{3}=(a\\pm b)(a^{2}\\mp ab+b^{2})" },

  /* Уравнения и неравенства */
  { section: "eq", name: "Квадратное уравнение", f: "ax^{2}+bx+c=0,\\quad x=\\dfrac{-b\\pm\\sqrt{D}}{2a},\\quad D=b^{2}-4ac" },
  { section: "eq", name: "Теорема Виета", f: "x_1+x_2=-\\dfrac{b}{a},\\quad x_1x_2=\\dfrac{c}{a}" },
  { section: "eq", name: "Линейное уравнение", f: "ax+b=0\\ \\Rightarrow\\ x=-\\dfrac{b}{a}\\ (a\\neq 0)" },
  { section: "eq", name: "Модуль", f: "|x|=a\\ \\Rightarrow\\ x=\\pm a\\ (a\\ge 0)" },

  /* Координаты и функции */
  { section: "func", name: "Линейная функция", f: "y=kx+b" },
  { section: "func", name: "Квадратичная функция и вершина", f: "y=ax^{2}+bx+c,\\quad x_0=-\\dfrac{b}{2a},\\quad y_0=y(x_0)" },
  { section: "func", name: "Обратная пропорциональность", f: "y=\\dfrac{k}{x}" },
  { section: "func", name: "Показательная и логарифмическая", f: "y=a^{x}\\ (a>0,\\ a\\neq 1),\\quad y=\\log_{a}x" },
  { section: "func", name: "Расстояние между точками", f: "d=\\sqrt{(x_2-x_1)^{2}+(y_2-y_1)^{2}}" },
  { section: "func", name: "Уравнение окружности", f: "(x-a)^{2}+(y-b)^{2}=r^{2}" },

  /* Геометрия */
  { section: "geo", name: "Площадь треугольника", f: "S=\\dfrac{1}{2}ah=\\dfrac{1}{2}ab\\sin\\gamma" },
  { section: "geo", name: "Площади четырёхугольников", f: "S_{пр}=ab,\\quad S_{пар}=ah,\\quad S_{тр}=\\dfrac{a+b}{2}h,\\quad S_{ром}=\\dfrac{1}{2}d_1d_2" },
  { section: "geo", name: "Круг и окружность", f: "S=\\pi r^{2},\\quad C=2\\pi r" },
  { section: "geo", name: "Теорема Пифагора", f: "a^{2}+b^{2}=c^{2}" },
  { section: "geo", name: "Теорема косинусов и синусов", f: "c^{2}=a^{2}+b^{2}-2ab\\cos\\gamma,\\quad \\dfrac{a}{\\sin\\alpha}=\\dfrac{b}{\\sin\\beta}=2R" },
  { section: "geo", name: "Радиусы вписанной и описанной окружностей", f: "r=\\dfrac{a+b-c}{2}\\ (\\text{для прям.}),\\quad R=\\dfrac{abc}{4S},\\quad r=\\dfrac{S}{p}" },
  { section: "geo", name: "Вписанный угол", f: "\\beta=\\dfrac{1}{2}\\,\\smile\\, AB" },
  { section: "geo", name: "Объёмы тел", f: "V_{куб}=a^{3},\\quad V_{пар}=abc,\\quad V_{шар}=\\dfrac{4}{3}\\pi R^{3},\\quad V_{цил}=\\pi R^{2}h" }
];
