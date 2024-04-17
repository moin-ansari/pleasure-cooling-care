import Image from "next/image";
import React from "react";
import { BsStarFill } from "react-icons/bs";
import { BsStarHalf } from "react-icons/bs";

const Experiences = ({ experience }: any) => {
  return (
    <div className="py-6 px-3">
      <p className="text-lg font-semibold mb-1">Experience:</p>
      <div className="flex flex-col gap-5">
        {experience.map((item: any, index: any) => (
          <div key={index} className="flex gap-3 h-32">
            <div className="w-4/5 flex flex-col gap-[6px]">
              <div className="flex text-sm font-semibold gap-5 justify-between">
                {/* <div>{item.logo}</div> */}
                <div>{item.company}</div>
                <div className="text-green-600">{item.years} Years</div>
              </div>
              <div className="text-[13px]">
                <div className="pb-[6px]">{item.work.description}</div>
                <div className="font-semibold text-[10px]">
                  <div>Complaints : {item.work.complaints}+</div>
                  <div className="flex gap-3 content-center">
                    <div>Customer Ratings: </div>
                    <div className="flex">
                      {item.work.ratings.map((elem: any, index: any) => (
                        <div className="flex items-center" key={index}>
                          {elem > 0.8 ? <BsStarFill /> : <BsStarHalf />}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="max-w-sm rounded overflow-hidden shadow-lg flex">
              <Image
                width={136}
                height={100}
                src={item.image}
                alt="prototype"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Experiences;
