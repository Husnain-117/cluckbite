import React from 'react';
import { Check, Award, Clock, Leaf, ChefHat, Flame } from 'lucide-react';

const AboutSection = () => {
  const features = [
    {
      icon: Award,
      title: 'Premium Quality',
      description: 'Only the freshest ingredients, sourced from trusted local suppliers',
    },
    {
      icon: Clock,
      title: 'Fast Service',
      description: 'Quick preparation without ever compromising on quality',
    },
    {
      icon: Leaf,
      title: 'Fresh Daily',
      description: 'All our food is prepared fresh every single day',
    },
  ];

  const commitments = [
    '100% Fresh Chicken',
    'Secret Family Recipes',
    'Made to Order',
    'Quality Guaranteed',
    'Halal Certified',
    'Local Ingredients',
  ];

  const stats = [
    { value: '10+', label: 'Years Experience' },
    { value: '50K+', label: 'Happy Customers' },
    { value: '4.9', label: 'Star Rating' },
  ];

  return (
    <section id="about" className="section-padding relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-secondary/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Image/Visual Side */}
          <div className="relative order-2 lg:order-1">
            <div className="relative">
              {/* Main image area */}
              <div className="relative bg-gradient-to-br from-card to-muted rounded-3xl p-6 md:p-10 border border-border shadow-2xl">
                <div className="aspect-square rounded-2xl bg-gradient-to-br from-muted/50 to-background flex items-center justify-center overflow-hidden">
                  <div className="text-center space-y-4">
                    <div className="relative inline-block">
                      <span className="text-[100px] md:text-[140px] drop-shadow-2xl filter">👨‍🍳</span>
                      <div className="absolute -bottom-2 -right-2 bg-primary rounded-full p-2 shadow-lg">
                        <Flame className="h-6 w-6 text-primary-foreground" />
                      </div>
                    </div>
                    <p className="text-xl md:text-2xl font-heading font-bold gradient-text">
                      Crafted with Passion
                    </p>
                  </div>
                </div>

                {/* Decorative elements */}
                <div className="absolute -top-4 -left-4 w-24 h-24 bg-secondary/20 rounded-2xl -z-10" />
                <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-primary/20 rounded-2xl -z-10" />
              </div>

              {/* Stats overlay */}
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-[90%] md:w-4/5">
                <div className="bg-gradient-to-r from-primary to-primary/90 rounded-2xl p-4 md:p-5 flex justify-around shadow-xl shadow-primary/20">
                  {stats.map((stat, index) => (
                    <React.Fragment key={stat.label}>
                      <div className="text-center px-2">
                        <p className="text-2xl md:text-3xl font-heading font-bold text-primary-foreground">{stat.value}</p>
                        <p className="text-xs md:text-sm text-primary-foreground/80 whitespace-nowrap">{stat.label}</p>
                      </div>
                      {index < stats.length - 1 && (
                        <div className="w-px bg-primary-foreground/20" />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Content Side */}
          <div className="order-1 lg:order-2">
            <span className="inline-block bg-primary/10 text-primary font-semibold px-4 py-2 rounded-full text-sm mb-6 border border-primary/20">
              Our Story
            </span>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold mb-6 leading-tight">
              Where Every Bite is a{' '}
              <span className="gradient-text">Celebration</span>
            </h2>
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              Born from a passion for perfect fried chicken, Cluck Bite has been serving up 
              crispy, juicy, and absolutely delicious chicken since day one. Our secret? 
              Premium ingredients, time-honored recipes, and a whole lot of love.
            </p>

            {/* Commitments Grid */}
            <div className="grid grid-cols-2 gap-3 mb-10">
              {commitments.map((item) => (
                <div key={item} className="flex items-center gap-3 bg-card/50 rounded-xl p-3 border border-border/50">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Check className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <span className="text-sm font-medium">{item}</span>
                </div>
              ))}
            </div>

            {/* Feature Cards */}
            <div className="space-y-4">
              {features.map((feature, index) => (
                <div
                  key={feature.title}
                  className="flex items-start gap-4 p-4 md:p-5 rounded-2xl bg-card border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg group"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-heading font-semibold text-lg mb-1">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
